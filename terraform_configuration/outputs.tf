output "vm_public_ips" {
  value = {
    for key, vm in azurerm_linux_virtual_machine.vms :
    key => {
      hostname = var.vm_instances[key].hostname
      ip       = azurerm_public_ip.ips[key].ip_address
      role     = var.vm_instances[key].role
    }
  }
  description = "Map of VM hostnames, public IPs, and roles"
}


# locals {
#   ssh_commands = {
#     vm1 = "ssh -i C:\\Users\\facuh\\.ssh\\1_5-2_vms azureuser@${azurerm_public_ip.ip1.ip_address}"
#     vm2 = "ssh -i C:\\Users\\facuh\\.ssh\\1_5-2_vms azureuser@${azurerm_public_ip.ip2.ip_address}"
#   }
# }
# 
# # azurerm ...
# output "ssh_vm1_command" {
#   value       = local.ssh_commands["vm1"]
#   description = "command to ssh to vm 1"
# }
# 
# output "ssh_vm2_command" {
#   value       = local.ssh_commands["vm2"]
#   description = "command to ssh to vm 2"
# }
# 
# 
# # for loop