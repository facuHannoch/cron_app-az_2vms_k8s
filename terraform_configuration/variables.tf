
variable "project" {
  default = "2_vms"
}

variable "env" {
  default = "dev"
}

####

variable "location" {
  type    = string
  default = "westus"
}

#variable "resource_group_name" {
#    type = string
#    default = "2_vms"
#}



# CIDR
variable "vnet_cidr" {
  default     = "10.0.0.0/24"
  description = "Address space for the VNet"
}

variable "subnet_cidr" {
  default     = "10.0.0.0/26"
  description = "CIDR block for subnet"
}

###

variable "tags" {
  type = map(string)
  default = {
    project     = "2_vms"
    environment = "dev"
    owner       = "io"
  }
  description = "Common tags for all resources"
}

###


variable "vm_instances" {
  type = map(object({
    hostname = string
    role     = string
  }))
  default = {
    vm1 = { hostname = "vm-control-plane", role = "master" }
    vm2 = { hostname = "vm-node", role = "worker" }
  }
}

variable "admin_username" {
  default = "azureuser"
}

variable "public_key_path" {
  default = "~/.ssh/1_5-2_vms.pub"
  # default = "${path.root}/.ssh/1_5-2_vms.pub"
  # path.root points to the directory where the Terraform root module is located, not ~ or your home directory
}

variable "vm_size" {
  default = "Standard_B2s"
}

## 

# variable "security_rules" {
#     type = map(object({
#         priority = number
#         direction = string
#         access = string
#         protocol = string
#         source_port_range = string
#         destination_port_range = string
#         source_address_prefix = string
#         destination_address_prefix = string
#     }))
# }

# "${var.project}"