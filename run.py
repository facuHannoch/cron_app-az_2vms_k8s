from collections import defaultdict
import json
import subprocess
from dotenv import load_dotenv
import os
load_dotenv()

script_dir = os.path.dirname(os.path.abspath(__file__))
# os.chdir(script_dir)

tf_path = os.path.join(script_dir, 'terraform_configuration')
ansible_path = os.path.join(script_dir, 'ansible_configuration')

# We will
# 1. Run terraform init
# 2. Load credential variables to interact with the Cloud Provider
# 3. Run terraform apply
# 4. Run terraform output
# 5. Run ansible-playbook to configure the servers created by terraform

# Terraform

os.chdir(tf_path)
subprocess.run(['terraform', 'init'], check=True)

#
subscription_id = os.getenv('ARM_SUBSCRIPTION_ID')
client_id = os.getenv('ARM_CLIENT_ID')
client_secret = os.getenv('ARM_CLIENT_SECRET')
tenant_id = os.getenv('ARM_TENANT_ID')

# Validate that all required environment variables are set
if not all([subscription_id, client_id, client_secret, tenant_id]):
    raise EnvironmentError("One or more required environment variables are missing.")


subprocess.run(['terraform', 'apply'], check=True)

# Capture terraform output in JSON format
tf_output = subprocess.run(['terraform', 'output', '-json'], check=True, stdout=subprocess.PIPE, text=True)
# Parse the JSON output
output_data = json.loads(tf_output.stdout)


# On a GHA pipeline, we would do it by stages, but this is for local
# # Stage 1
# subprocess.run(['terraform', 'plan', '-out=tfplan'], check=True)
# with open(f"{tf_path}/tfplan.txt", mode='w+', encoding='utf8') as plan:
#     subprocess.run(['terraform', 'show', '-no-color', 'tfplan'], check=True, stdout=plan)
# # Stage 2 - Terraform Apply
# subprocess.run(['terraform', 'apply', 'tfplan'], check=True)




#######################
# Ansible

# We now have the terraform output data, so we will create the inventory file dynamically


with open(f"{ansible_path}/hosts.ini", mode='w+', encoding='utf8') as hosts_file:
    vms = output_data['vm_public_ips']["value"]
    groups = defaultdict(list)
    for vm, info in vms.items():
        groups[info['role']].append(info)
    
    for group, members in groups.items():
        hosts_file.write(f"[{group}]\n")
        for member in members:
            hosts_file.write(f"{member['hostname']} ansible_host={member['ip']}\n")
        hosts_file.write("\n")


# Now it is left to run the playbook
# subprocess.run(['ansible-playbook' ])




# hosts_file = open('./ansible_configuration/hosts.ini', mode='w+', encoding='utf8')
# hosts_file.close()

# Artifacts to persist/upload
# - tfplan
# - tfplan.txt
