output "service_name" {
  description = "Lightsail container service name."
  value       = aws_lightsail_container_service.app.name
}

output "service_url" {
  description = "Default HTTPS URL for the service (use as Strava callback host)."
  value       = local.service_url
}

output "service_state" {
  description = "Current Lightsail service state."
  value       = aws_lightsail_container_service.app.state
}

output "deployment_version" {
  description = "Active deployment version, if any."
  value       = try(aws_lightsail_container_service_deployment_version.app[0].version, null)
}

output "strava_callback_domain" {
  description = "Hostname to paste into Strava Authorization Callback Domain."
  value       = replace(local.service_url, "https://", "")
}
