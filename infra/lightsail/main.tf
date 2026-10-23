resource "aws_lightsail_container_service" "app" {
  name  = var.service_name
  power = var.power
  scale = var.scale

  tags = {
    app = "paddleerg"
  }
}

locals {
  service_url = trimsuffix(aws_lightsail_container_service.app.url, "/")
}

resource "aws_lightsail_container_service_deployment_version" "app" {
  count = var.container_image != "" ? 1 : 0

  service_name = aws_lightsail_container_service.app.name

  container {
    container_name = "app"
    image          = var.container_image

    environment = {
      PORT                 = tostring(var.container_port)
      STATIC_DIR           = "/app/server/public"
      STRAVA_CLIENT_ID     = var.strava_client_id
      STRAVA_CLIENT_SECRET = var.strava_client_secret
      STRAVA_REDIRECT_URI  = "${local.service_url}/strava/callback"
      CLIENT_RETURN_URL    = local.service_url
      CORS_ORIGINS         = local.service_url
    }

    ports = {
      (tostring(var.container_port)) = "HTTP"
    }
  }

  public_endpoint {
    container_name = "app"
    container_port = var.container_port

    health_check {
      healthy_threshold   = 2
      unhealthy_threshold = 2
      timeout_seconds     = 2
      interval_seconds    = 5
      path                = "/health"
      success_codes       = "200"
    }
  }
}
