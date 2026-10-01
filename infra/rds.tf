resource "aws_db_subnet_group" "main" {
  name        = "formflow-rds-subnet-group"
  description = "FormFlow RDS Subnet Group spanning ap-south-1a and ap-south-1b"
  subnet_ids  = [aws_subnet.db.id, aws_subnet.db_secondary.id]

  tags = {
    Name = "formflow-rds-subnet-group"
  }
}

resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "postgres" {
  identifier     = "formflow-postgres"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = var.db_port

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false
  multi_az            = false
  availability_zone   = var.availability_zone

  backup_retention_period    = var.db_backup_retention_period
  backup_window              = var.db_backup_window
  maintenance_window         = var.db_maintenance_window
  auto_minor_version_upgrade = true

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name = "formflow-postgres"
  }
}
