import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { StoreSchedule } from './entities/store-schedule.entity';
import { StoreException } from './entities/store-exception.entity';

export const MAX_PICKUP_DAYS_AHEAD = 30;
export const CALENDAR_DAYS = 365;
export const MAX_ACTIVE_BANNERS = 2;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Hours {
  open1?: string | null;
  close1?: string | null;
  open2?: string | null;
  close2?: string | null;
}

export interface DayInfo {
  open: boolean;
  ranges: { from: string; to: string }[];
  lastCloseMinutes: number | null;
  reason: string | null;
  hasException: boolean;
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function madridNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function dayNumber(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function isRealDate(dateStr: string) {
  if (!DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === dateStr;
}

function weekdayOf(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatDateEs(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function cleanHours(h: Hours) {
  return {
    open1: h.open1 || null,
    close1: h.close1 || null,
    open2: h.open2 || null,
    close2: h.close2 || null,
  };
}

/** Devuelve un mensaje de error si los tramos horarios no son válidos. */
function validateHours(h: Hours): string | null {
  const { open1, close1, open2, close2 } = cleanHours(h);
  for (const t of [open1, close1, open2, close2]) {
    if (t && !TIME_RE.test(t)) return 'Hora no válida (usa el formato HH:MM).';
  }
  if ((open1 && !close1) || (!open1 && close1)) {
    return 'El tramo de mañana necesita hora de apertura y de cierre (o déjalo vacío si no abres por la mañana).';
  }
  if ((open2 && !close2) || (!open2 && close2)) {
    return 'El tramo de tarde necesita hora de apertura y de cierre (o déjalo vacío si no abres por la tarde).';
  }
  if (!open1 && !open2) {
    return 'Indica al menos un tramo (mañana o tarde), o marca el día como cerrado.';
  }
  if (open1 && close1 && toMinutes(close1) <= toMinutes(open1)) {
    return 'En el tramo de mañana, el cierre debe ser posterior a la apertura.';
  }
  if (open2 && close2 && toMinutes(close2) <= toMinutes(open2)) {
    return 'En el tramo de tarde, el cierre debe ser posterior a la apertura.';
  }
  if (close1 && open2 && toMinutes(open2) <= toMinutes(close1)) {
    return 'El tramo de tarde debe empezar después de que cierre el de mañana.';
  }
  return null;
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(StoreSchedule)
    private readonly weeklyRepository: Repository<StoreSchedule>,
    @InjectRepository(StoreException)
    private readonly exceptionsRepository: Repository<StoreException>,
  ) {}

  private buildDay(
    dateStr: string,
    weekly: StoreSchedule | undefined,
    exception: StoreException | undefined,
  ): DayInfo {
    const open = exception ? !exception.closed : Boolean(weekly?.isOpen);
    const source: Hours | undefined = exception && !exception.closed ? exception : weekly;
    const ranges: { from: string; to: string }[] = [];
    if (open && source) {
      if (source.open1 && source.close1) ranges.push({ from: source.open1, to: source.close1 });
      if (source.open2 && source.close2) ranges.push({ from: source.open2, to: source.close2 });
    }
    return {
      open,
      ranges,
      lastCloseMinutes: ranges.length ? toMinutes(ranges[ranges.length - 1].to) : null,
      reason: exception?.reason ?? null,
      hasException: Boolean(exception),
    };
  }

  async getDay(dateStr: string): Promise<DayInfo> {
    const [weekly, exception] = await Promise.all([
      this.weeklyRepository.findOneBy({ weekday: weekdayOf(dateStr) }),
      this.exceptionsRepository.findOneBy({ date: dateStr }),
    ]);
    return this.buildDay(dateStr, weekly ?? undefined, exception ?? undefined);
  }

  /** Agrupa las modificaciones futuras en "avisos": un rango de fechas es un solo aviso. */
  private buildUnits(exceptions: StoreException[], todayN: number) {
    const groups = new Map<string, StoreException[]>();
    for (const e of exceptions) {
      if (dayNumber(e.date) < todayN) continue;
      const key = e.rangeId ?? `d:${e.date}`;
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()].map(([key, rows]) => {
      rows.sort((a, b) => a.date.localeCompare(b.date));
      const first = rows[0].date;
      const last = rows[rows.length - 1].date;
      const showNow = rows[0].showNow;
      return {
        key,
        rows,
        first,
        last,
        showNow,
        start: showNow ? todayN : dayNumber(first) - 1,
        end: dayNumber(last),
        sample: rows[0],
      };
    });
  }

  private dateFromNumber(n: number) {
    return new Date(n * 86400000).toISOString().slice(0, 10);
  }

  /** Lanza un error si añadir este aviso haría que hubiese más de 2 activos a la vez. */
  private assertBannerCapacity(
    candidate: { first: string; last: string; showNow: boolean },
    others: StoreException[],
    todayN: number,
  ) {
    const units = this.buildUnits(others, todayN);
    const cStart = candidate.showNow ? todayN : dayNumber(candidate.first) - 1;
    const cEnd = dayNumber(candidate.last);
    const points = [
      cStart,
      ...units.map((u) => u.start).filter((st) => st >= cStart && st <= cEnd),
    ];
    for (const point of points) {
      const group = units.filter((u) => u.start <= point && point <= u.end);
      if (group.length >= MAX_ACTIVE_BANNERS) {
        const conflicts = group.slice(0, MAX_ACTIVE_BANNERS).map((u) => ({
          date: u.first,
          dateTo: u.last,
          reason: u.sample.reason,
          closed: u.sample.closed,
        }));
        const list = conflicts
          .map((c) => {
            const label = c.reason || (c.closed ? 'Cerrado' : 'Horario especial');
            const when =
              c.date === c.dateTo
                ? formatDateEs(c.date)
                : `${formatDateEs(c.date)}–${formatDateEs(c.dateTo)}`;
            return `«${label}» (${when})`;
          })
          .join(' y ');
        throw new BadRequestException({
          message: `No se puede añadir otro aviso: ya hay ${MAX_ACTIVE_BANNERS} avisos activados a la vez: ${list}. Quita o cambia uno de ellos antes de continuar.`,
          conflicts,
        });
      }
    }
  }

  async getPublic() {
    const now = madridNow();
    const todayN = dayNumber(now.dateStr);
    const [weekly, allExceptions] = await Promise.all([
      this.weeklyRepository.find({ order: { weekday: 'ASC' } }),
      this.exceptionsRepository.find({ order: { date: 'ASC' } }),
    ]);

    const inWindow = allExceptions.filter((e) => {
      const n = dayNumber(e.date);
      return n >= todayN && n <= todayN + CALENDAR_DAYS;
    });
    const units = this.buildUnits(inWindow, todayN);

    const exceptions = units
      .flatMap((u) =>
        u.rows.map((e) => ({
          id: e.id,
          date: e.date,
          rangeId: e.rangeId,
          closed: e.closed,
          open1: e.open1,
          close1: e.close1,
          open2: e.open2,
          close2: e.close2,
          reason: e.reason,
          showNow: e.showNow,
          bannerActive: todayN >= u.start,
          bannerFrom: this.dateFromNumber(u.start),
        })),
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    const banners = units
      .filter((u) => todayN >= u.start)
      .sort((a, b) => a.first.localeCompare(b.first))
      .slice(0, MAX_ACTIVE_BANNERS)
      .map((u) => ({
        date: u.first,
        dateTo: u.last,
        rangeId: u.sample.rangeId,
        closed: u.sample.closed,
        open1: u.sample.open1,
        close1: u.sample.close1,
        open2: u.sample.open2,
        close2: u.sample.close2,
        reason: u.sample.reason,
        showNow: u.showNow,
        bannerActive: true,
      }));

    return {
      today: now.dateStr,
      weekly: weekly.map((w) => ({
        weekday: w.weekday,
        isOpen: w.isOpen,
        open1: w.open1,
        close1: w.close1,
        open2: w.open2,
        close2: w.close2,
      })),
      exceptions,
      banners,
    };
  }

  async saveWeekly(days: any[]) {
    if (!Array.isArray(days) || days.length !== 7) {
      throw new BadRequestException('Faltan datos de los días de la semana.');
    }
    const rows: StoreSchedule[] = [];
    const seen = new Set<number>();
    for (const d of days) {
      const weekday = Number(d.weekday);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || seen.has(weekday)) {
        throw new BadRequestException('Día de la semana no válido.');
      }
      seen.add(weekday);
      const names = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      if (d.isOpen) {
        const error = validateHours(d);
        if (error) throw new BadRequestException(`${names[weekday]}: ${error}`);
      }
      rows.push(
        this.weeklyRepository.create({
          weekday,
          isOpen: Boolean(d.isOpen),
          ...(d.isOpen
            ? cleanHours(d)
            : { open1: null, close1: null, open2: null, close2: null }),
        }),
      );
    }
    await this.weeklyRepository.save(rows);
    return this.getPublic();
  }

  async saveException(dto: {
    date: string;
    closed?: boolean;
    open1?: string;
    close1?: string;
    open2?: string;
    close2?: string;
    reason?: string;
    showNow?: boolean;
  }) {
    const now = madridNow();
    const todayN = dayNumber(now.dateStr);
    if (!dto.date || !isRealDate(dto.date)) {
      throw new BadRequestException('Fecha no válida.');
    }
    const dateN = dayNumber(dto.date);
    if (dateN < todayN || dateN > todayN + CALENDAR_DAYS - 1) {
      throw new BadRequestException('Solo se pueden modificar días desde hoy hasta dentro de un año.');
    }

    const closed = dto.closed !== false;
    if (!closed) {
      const error = validateHours(dto);
      if (error) throw new BadRequestException(error);
    }
    const reason = dto.reason?.trim().slice(0, 300) || null;
    const showNow = Boolean(dto.showNow);

    const existing = await this.exceptionsRepository.findOneBy({ date: dto.date });
    if (existing?.rangeId) {
      throw new BadRequestException(
        'Ese día forma parte de un rango de fechas. Edita o quita el rango completo.',
      );
    }

    const others = (await this.exceptionsRepository.find()).filter((e) => e.date !== dto.date);
    this.assertBannerCapacity({ first: dto.date, last: dto.date, showNow }, others, todayN);

    const entity = this.exceptionsRepository.create({
      ...(existing ? { id: existing.id } : {}),
      date: dto.date,
      closed,
      ...(closed ? { open1: null, close1: null, open2: null, close2: null } : cleanHours(dto)),
      reason,
      showNow,
      rangeId: null,
    });
    await this.exceptionsRepository.save(entity);
    return this.getPublic();
  }

  async saveRange(dto: {
    from: string;
    to: string;
    rangeId?: string;
    closed?: boolean;
    open1?: string;
    close1?: string;
    open2?: string;
    close2?: string;
    reason?: string;
    showNow?: boolean;
  }) {
    const now = madridNow();
    const todayN = dayNumber(now.dateStr);
    if (!dto.from || !dto.to || !isRealDate(dto.from) || !isRealDate(dto.to)) {
      throw new BadRequestException('Indica la fecha de inicio y la de fin del rango.');
    }
    const fromN = dayNumber(dto.from);
    const toN = dayNumber(dto.to);
    if (toN < fromN) throw new BadRequestException('La fecha de fin no puede ser anterior a la de inicio.');
    if (fromN < todayN || toN > todayN + CALENDAR_DAYS - 1) {
      throw new BadRequestException('Solo se pueden modificar días desde hoy hasta dentro de un año.');
    }

    const closed = dto.closed !== false;
    if (!closed) {
      const error = validateHours(dto);
      if (error) throw new BadRequestException(error);
    }
    const reason = dto.reason?.trim().slice(0, 300) || null;
    const showNow = Boolean(dto.showNow);
    const inRange = (date: string) => date >= dto.from && date <= dto.to;

    const all = await this.exceptionsRepository.find();
    const clash = all.find((e) => e.rangeId && e.rangeId !== dto.rangeId && inRange(e.date));
    if (clash) {
      throw new BadRequestException(
        `Esas fechas se solapan con otro rango (${formatDateEs(clash.date)}). Edita o quita ese rango antes.`,
      );
    }

    // Se sustituyen el rango que se edita y las modificaciones sueltas que caigan dentro
    const others = all.filter((e) => e.rangeId !== dto.rangeId && !(inRange(e.date) && !e.rangeId));
    this.assertBannerCapacity({ first: dto.from, last: dto.to, showNow }, others, todayN);

    const rangeId = dto.rangeId ?? randomUUID();
    const hours = closed
      ? { open1: null, close1: null, open2: null, close2: null }
      : cleanHours(dto);
    const rows: StoreException[] = [];
    for (let n = fromN; n <= toN; n += 1) {
      rows.push(
        this.exceptionsRepository.create({
          date: this.dateFromNumber(n),
          closed,
          ...hours,
          reason,
          showNow,
          rangeId,
        }),
      );
    }

    await this.exceptionsRepository.manager.transaction(async (manager) => {
      if (dto.rangeId) await manager.delete(StoreException, { rangeId: dto.rangeId });
      await manager
        .createQueryBuilder()
        .delete()
        .from(StoreException)
        .where('date BETWEEN :from AND :to AND range_id IS NULL', { from: dto.from, to: dto.to })
        .execute();
      await manager.save(rows);
    });
    return this.getPublic();
  }

  async removeException(date: string) {
    const existing = await this.exceptionsRepository.findOneBy({ date });
    if (existing?.rangeId) {
      throw new BadRequestException(
        'Ese día forma parte de un rango de fechas. Quita el rango completo.',
      );
    }
    await this.exceptionsRepository.delete({ date });
    return this.getPublic();
  }

  async removeRange(rangeId: string) {
    await this.exceptionsRepository.delete({ rangeId });
    return this.getPublic();
  }

  /** Devuelve un mensaje de error si la fecha de recogida no es válida, o null si lo es. */
  async validatePickupDate(dateStr: string | undefined): Promise<string | null> {
    if (!dateStr || !DATE_RE.test(dateStr)) return 'Elige una fecha de recogida.';
    if (!isRealDate(dateStr)) return 'La fecha de recogida no es válida.';

    const now = madridNow();
    const daysAhead = dayNumber(dateStr) - dayNumber(now.dateStr);
    if (daysAhead < 0) return 'La fecha de recogida ya ha pasado.';
    if (daysAhead > MAX_PICKUP_DAYS_AHEAD) {
      return `Solo se puede reservar con un máximo de ${MAX_PICKUP_DAYS_AHEAD} días de antelación.`;
    }

    const day = await this.getDay(dateStr);
    if (!day.open) {
      return `La tienda estará cerrada ese día${day.reason ? `: ${day.reason}` : '.'}`;
    }
    if (daysAhead === 0 && day.lastCloseMinutes !== null && now.minutes >= day.lastCloseMinutes) {
      return 'Hoy ya hemos cerrado, elige otro día.';
    }
    return null;
  }
}
