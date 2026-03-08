CREATE TABLE payment_method_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_method_id BIGINT,
  parent_id BIGINT NOT NULL,
  action ENUM('ADD', 'UPDATE', 'DELETE') NOT NULL,
  old_state JSON,
  new_state JSON,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES parents (id)
);
