ALTER TABLE payment_methods ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE payment_methods pm
JOIN (
  SELECT parent_id, MIN(date) AS oldest_date
  FROM invoices
  GROUP BY parent_id
) inv ON pm.parent_id = inv.parent_id
SET pm.created_at = inv.oldest_date;
