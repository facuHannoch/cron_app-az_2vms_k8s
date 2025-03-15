locals {
  ssh_commands = {
    vm1 = "ssh -i C:\\Users\\facuh\\.ssh\\1_azure_simple_vm_deployment azureuser@${azurerm_public_ip.ip1.ip_address}"
    vm2 = "ssh -i C:\\Users\\facuh\\.ssh\\1_azure_simple_vm_deployment azureuser@${azurerm_public_ip.ip2.ip_address}"
  }
}

# azurerm ...
output "ssh_vm1_command" {
  value       = local.ssh_commands["vm1"]
  description = "command to ssh to vm 1"
}

output "ssh_vm2_command" {
  value       = local.ssh_commands["vm2"]
  description = "command to ssh to vm 2"
}


# for loop