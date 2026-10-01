resource "aws_elasticache_subnet_group" "main" {
  name        = "formflow-cache-subnet-group"
  description = "FormFlow ElastiCache Subnet Group across private DB subnets"
  subnet_ids  = [aws_subnet.db.id, aws_subnet.db_secondary.id]

  tags = {
    Name = "formflow-cache-subnet-group"
  }
}

resource "random_password" "cache_auth_token" {
  length  = 32
  special = false
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "formflow-cache"
  description          = "FormFlow Shared In-Memory Cache"
  engine               = var.cache_engine
  engine_version       = var.cache_engine_version
  node_type            = var.cache_node_type
  num_cache_clusters   = 1
  parameter_group_name = var.cache_parameter_group_name
  port                 = var.cache_port

  subnet_group_name           = aws_elasticache_subnet_group.main.name
  security_group_ids          = [aws_security_group.cache.id]
  preferred_cache_cluster_azs = [var.availability_zone]

  automatic_failover_enabled = false
  multi_az_enabled           = false

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.cache_auth_token.result

  auto_minor_version_upgrade = true
  apply_immediately          = true
  maintenance_window         = var.cache_maintenance_window
  snapshot_retention_limit   = 0

  tags = {
    Name = "formflow-cache"
  }
}
