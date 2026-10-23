variable "aws_region" {
  type        = string
  description = "AWS region for the Lightsail container service."
  default     = "us-east-1"
}

variable "service_name" {
  type        = string
  description = "Lightsail container service name (appears in the default HTTPS URL)."
  default     = "paddleerg"
}

variable "power" {
  type        = string
  description = "Lightsail container power (nano is smallest)."
  default     = "nano"
}

variable "scale" {
  type        = number
  description = "Number of container nodes."
  default     = 1
}

variable "container_image" {
  type        = string
  description = "Lightsail image name from push-container-image (e.g. :paddleerg.app.1). Empty skips deployment."
  default     = ""
}

variable "strava_client_id" {
  type        = string
  description = "Strava OAuth client id."
  sensitive   = true
  default     = ""
}

variable "strava_client_secret" {
  type        = string
  description = "Strava OAuth client secret (server only)."
  sensitive   = true
  default     = ""
}

variable "container_port" {
  type        = number
  description = "HTTP port the container listens on."
  default     = 8080
}
