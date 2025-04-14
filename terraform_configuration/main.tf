## locals

locals {
  default_security_rules = jsondecode(file("${path.module}/rules.json"))
}


###


terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.26"
    }
  }

  required_version = ">= 1.1.0"
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "2_vms-kubernetes_cluster-${var.env}" # consistent naming convention (snake_case or kebab-case) ?
  location = var.location
}

resource "azurerm_virtual_network" "vnet" {
  name                = "${var.project}__${var.env}__vnet"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  address_space       = [var.vnet_cidr]

  tags = var.tags
}

resource "azurerm_subnet" "sn" {
  name                 = "${var.project}__${var.env}__subnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.subnet_cidr]
}

resource "azurerm_public_ip" "ips" {
  for_each = var.vm_instances

  name                = "${each.value.hostname}-public-ip"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"

  tags = var.tags
}

resource "azurerm_network_interface" "nics" {
  for_each = var.vm_instances

  name                = "${each.value.hostname}-nic"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.sn.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.ips[each.key].id
  }
  tags = var.tags
}

resource "azurerm_network_security_group" "nsg" {
  # network_security_group_name
  name                = "${var.project}-${var.env}-nsg"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  tags                = var.tags
}

resource "azurerm_network_security_rule" "rules" {
  for_each = local.default_security_rules

  name                       = each.key
  priority                   = each.value.priority
  direction                  = each.value.direction
  access                     = each.value.access
  protocol                   = each.value.protocol
  source_port_range          = each.value.source_port_range
  destination_port_range     = each.value.destination_port_range
  source_address_prefix      = each.value.source_address_prefix
  destination_address_prefix = each.value.destination_address_prefix

  resource_group_name         = azurerm_resource_group.rg.name
  network_security_group_name = azurerm_network_security_group.nsg.name
}

resource "azurerm_network_interface_security_group_association" "nics_nsgs" {
  for_each = azurerm_network_interface.nics

  network_interface_id      = each.value.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}


## 2_vms

resource "azurerm_linux_virtual_machine" "vms" {
  for_each = var.vm_instances

  name                  = "${var.project}-${each.value.hostname}"
  computer_name         = each.value.hostname
  resource_group_name   = azurerm_resource_group.rg.name
  location              = var.location
  network_interface_ids = [azurerm_network_interface.nics[each.key].id]
  size                  = var.vm_size
  admin_username        = var.admin_username

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.public_key_path)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  tags = merge(var.tags, {
    role = each.value.role
  })
}