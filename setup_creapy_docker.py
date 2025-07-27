"""Setup creapy configuration in Docker container using real source files"""

import os
import shutil
from pathlib import Path

# Create necessary directories
os.makedirs(os.path.expanduser('~/.creapy'), exist_ok=True)

# After installation, find where creapy is installed
import creapy
creapy_path = Path(creapy.__file__).parent

print(f"Creapy installed at: {creapy_path}")

# Copy the real config files from the cloned source
shutil.copy2('/app/creapy_config.yaml', creapy_path / 'config.yaml')
print(f"Copied real config.yaml to: {creapy_path / 'config.yaml'}")

shutil.copy2('/app/creapy_user_config.yaml', creapy_path / 'user_config.yaml') 
print(f"Copied real user_config.yaml to: {creapy_path / 'user_config.yaml'}")

# Copy the real model files
models_dir = creapy_path / "model" / "training_models"
models_dir.mkdir(parents=True, exist_ok=True)

# Copy all model files
for model_file in Path('/app/training_models').glob('*.csv'):
    shutil.copy2(model_file, models_dir / model_file.name)
    print(f"Copied model file: {model_file.name}")

# Create empty user config to avoid conflicts
user_home_config = Path.home() / '.creapy' / 'config.yaml'
user_home_config.parent.mkdir(exist_ok=True)
with open(user_home_config, 'w') as f:
    f.write("{}")
print(f"Created empty user config at: {user_home_config}")

print("\nCreapy setup complete with real configuration and models!")