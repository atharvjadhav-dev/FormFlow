resource "aws_launch_template" "app" {
  name        = "formflow-launch-template"
  description = "v1-initial-ec2-asg"

  image_id      = var.ami_id
  instance_type = var.instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2.arn
  }

  network_interfaces {
    device_index                = 0
    associate_public_ip_address = true
    security_groups             = [aws_security_group.ec2.id]
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  user_data = filebase64("${path.module}/scripts/user-data.sh")

  tag_specifications {
    resource_type = "instance"
    tags = merge(local.common_tags, {
      Name = "formflow-app-instance"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(local.common_tags, {
      Name = "formflow-root-volume"
    })
  }

  tags = {
    Name = "formflow-launch-template"
  }
}
