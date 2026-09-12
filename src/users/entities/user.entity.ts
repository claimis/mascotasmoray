import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  surname: string;

  @Column({ name: 'contact_mail', nullable: true })
  contactMail: string;

  @Column({ name: 'contact_telf', nullable: true })
  contactTelf: string;

  @Column({ nullable: true })
  address: string;

  @Column()
  password: string;

  @Column({ default: 'customer' })
  role: string;
}
