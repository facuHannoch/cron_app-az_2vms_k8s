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

# ################
# We will
# 1. Run terraform init
# 2. Load credential variables to interact with the Cloud Provider
# 3. Run terraform apply
# 4. Run terraform output
# 5. Run ansible-playbook to configure the servers created by terraform
# ################

## #####################
# Terraform

os.chdir(tf_path)
subprocess.run(['terraform', 'init'], check=True)

public_key_path = os.getenv('PUBLIC_KEY_PATH')
ansible_user = os.getenv('ANSIBLE_USER')

#
subscription_id = os.getenv('ARM_SUBSCRIPTION_ID')
client_id = os.getenv('ARM_CLIENT_ID')
client_secret = os.getenv('ARM_CLIENT_SECRET')
tenant_id = os.getenv('ARM_TENANT_ID')


# Validate that all required environment variables are set
if not all([subscription_id, client_id, client_secret, tenant_id]):
    raise EnvironmentError("One or more required environment variables are missing.")

os.environ['TF_public_key_path'] = public_key_path
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




## #####################
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
    
    hosts_file.write("[all:vars]\n")
    hosts_file.write(f"ansible_user={ansible_user}\n")
    hosts_file.write(f"ansible_ssh_private_key_file={public_key_path}\n")


# Now it is left to run the playbook
def run_all_playbooks(ansible_path):
    playbooks_dir = os.path.join(ansible_path, 'playbooks')
    inventory_path = os.path.join(ansible_path, 'hosts.ini')
    playbook_files = [f for f in os.listdir(playbooks_dir) if f.endswith('.yml') or f.endswith('.yaml')]
    outputs = []

    for playbook in playbook_files:
        playbook_path = os.path.join(playbooks_dir, playbook)
        result = subprocess.run(['ansible-playbook', playbook_path, '-i', inventory_path], check=True, stdout=subprocess.PIPE, text=True)
        outputs.append(result.stdout)

    return outputs

# Run all playbooks and capture their outputs
playbook_outputs = run_all_playbooks(ansible_path)
# for output in playbook_outputs:
    # print(output)
# Save playbook outputs to a Markdown file
output_md_path = os.path.join(script_dir, 'playbook_outputs.md')
with open(output_md_path, mode='w+', encoding='utf8') as md_file:
    md_file.write("# Playbook Outputs\n\n")
    for i, output in enumerate(playbook_outputs, start=1):
        md_file.write(f"## Playbook {i}\n\n")
        md_file.write("```yaml\n")
        md_file.write(output)
        md_file.write("\n```\n\n")

        

# Artifacts to persist/upload
# - tfplan
# - tfplan.txt
