# ==============================================================================
# CloudFront Distribution for FormFlow (Phase 4.12)
# ==============================================================================
# Fronts the Application Load Balancer with edge caching for static assets
# while bypassing cache for dynamic routes, authentication, and API calls.
# ==============================================================================

locals {
  # AWS Managed Cache Policies
  cache_policy_caching_disabled  = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  cache_policy_caching_optimized = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized

  # AWS Managed Origin Request Policies
  origin_request_policy_all_viewer = "216adef6-5c7f-47e4-b989-5492eafa07d3" # Managed-AllViewer
}

resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "CloudFront distribution for FormFlow"
  price_class     = "PriceClass_100"
  aliases         = [var.domain_name]

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "formflow-alb-origin"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 5
      origin_read_timeout      = 30
    }
  }

  # Default cache behavior for dynamic/SSR pages: Caching Disabled, pass all viewer headers & cookies
  default_cache_behavior {
    target_origin_id       = "formflow-alb-origin"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = local.cache_policy_caching_disabled
    origin_request_policy_id = local.origin_request_policy_all_viewer
  }

  # Ordered Cache Behavior 1: Next.js Compiled Static Bundles (/_next/static/*)
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "formflow-alb-origin"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = local.cache_policy_caching_optimized
    origin_request_policy_id = local.origin_request_policy_all_viewer
  }

  # Ordered Cache Behavior 2: Next.js Optimized Images (/_next/image*)
  ordered_cache_behavior {
    path_pattern           = "/_next/image*"
    target_origin_id       = "formflow-alb-origin"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = local.cache_policy_caching_optimized
    origin_request_policy_id = local.origin_request_policy_all_viewer
  }

  # Ordered Cache Behavior 3: API & Webhooks (/api/*) - strictly no caching
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "formflow-alb-origin"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = local.cache_policy_caching_disabled
    origin_request_policy_id = local.origin_request_policy_all_viewer
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}
