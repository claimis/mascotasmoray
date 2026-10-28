-- Código de barras (EAN) de los productos: solo se usa en admin.
-- Columna vacía por defecto: no cambia ningún dato existente.
-- No es única: el TPV tiene 20 códigos repetidos en productos distintos.
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(40);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode);
