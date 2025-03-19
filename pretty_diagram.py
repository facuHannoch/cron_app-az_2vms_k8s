from diagrams import Diagram
from diagrams.azure.compute import VMLinux
from diagrams.azure.network import NetworkInterfaces, VirtualNetworks, PublicIpAddresses, NetworkSecurityGroupsClassic
from diagrams.azure.general import Resourcegroups
from diagrams.custom import Custom

# Increase nodesep/ranksep to add more space between nodes
graph_attr = {
    "nodesep": "2.5",   # default is about 0.25
    "ranksep": "2.5",   # default is about 0.5
    "margin": "0.2",    # extra padding around the entire diagram
}

# Set the layout direction to right-to-left (RL) like your DOT graph
with Diagram("Terraform Diagram", show=False, direction="RL", graph_attr=graph_attr):
    # Use VMLinux to represent your Linux VMs
    vm1 = VMLinux("azurerm_linux_virtual_machine.vm1")
    vm2 = VMLinux("azurerm_linux_virtual_machine.vm2")
    
    nic1 = NetworkInterfaces("azurerm_network_interface.nic1")
    nic2 = NetworkInterfaces("azurerm_network_interface.nic2")
    
    # If there is no dedicated NSG association node, use a custom node (replace "./assoc.png" with your image)
    assoc1 = Custom("azurerm_nsg_assoc.nic_nsg1", "./assoc.png")
    assoc2 = Custom("azurerm_nsg_assoc.nic_nsg2", "./assoc.png")
    
    nsg = NetworkSecurityGroupsClassic("azurerm_network_security_group.nsg")
    ip1 = PublicIpAddresses("azurerm_public_ip.ip1")
    ip2 = PublicIpAddresses("azurerm_public_ip.ip2")
    
    # For the subnet, if no matching node exists, a custom node can be used (replace "./subnet.png" accordingly)
    subnet = Custom("azurerm_subnet.sn", "./subnet.png")
    vnet = VirtualNetworks("azurerm_virtual_network.vnet")
    
    rg = Resourcegroups("azurerm_resource_group.rg")
    
    # Define connections similar to your Terraform dependency graph
    vm1 >> nic1
    vm2 >> nic2
    nic1 >> ip1
    nic1 >> subnet
    nic2 >> ip2
    nic2 >> subnet
    assoc1 >> nic1
    assoc1 >> nsg
    assoc2 >> nic2
    assoc2 >> nsg
    nsg >> rg
    ip1 >> rg
    ip2 >> rg
    subnet >> vnet
    vnet >> rg
