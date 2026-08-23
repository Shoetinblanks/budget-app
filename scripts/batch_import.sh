#!/bin/bash

# Compile the TypeScript file first
npx tsc scripts/manual_import.ts --esModuleInterop --resolveJsonModule --module commonjs

# Declare mapping array: "filename:org_id:user_id"
declare -a MAPPINGS=(
  "import_ahawker.json:a08218ef-6133-415a-96dd-fb30aa9695ed:e4d2df4a-7573-4315-90fd-766c9e1e0803"
  "import_carolyn.json:ec616b61-d1ad-42fc-b18d-171d12469fc2:2de0489d-5951-4746-9b9c-04b5da848435"
  "import_cat1225g.json:4bb82aea-798a-4f01-86f3-ac5faacdb83b:5ebca4df-2022-4af1-8838-30293b84548b"
  "import_chantiell.json:dcb7e234-3285-4202-957f-f00abe64cf2a:80d27473-6294-44f4-a3d4-62a3bc199d54"
  "import_cherrybomb.json:f45d4e9c-7028-4a1b-ae01-d3a12c4faf5e:e200e3b7-1a97-4e52-9ac0-88a540c94a4c"
  "import_luckylarson2000.json:f11387d7-2ccc-4e0a-992a-8ddcb4ff5b1f:044a8751-3378-4385-87bc-c8bb5c04c141"
  "import_mrslsmalls.json:a5a176ec-eb34-4ea2-a67a-b5daace6083e:633eed7b-e484-47b0-babd-60e04eff07a2"
  "import_rockyp2000.json:cba6653c-13cd-4c67-a608-b3ed7d1a7ef9:1074f9c1-026f-464e-9edc-dcecda1bf459"
  "import_ta2dldy2.json:a697e91a-8f7a-4373-a805-f5a8f1526625:3c2738d0-93cd-4108-8b8a-01df0cb012d5"
  "import_toadytots.json:9fbfd44c-a9a6-47b0-9d82-342ff1e6870e:cd405b17-c470-4704-8fa9-12e44f205eb4"
)

for MAPPING in "${MAPPINGS[@]}"; do
  IFS=':' read -r FILENAME ORG_ID USER_ID <<< "$MAPPING"
  
  FILEPATH="LegacyImports/$FILENAME"
  
  if [ -f "$FILEPATH" ] || [ -f "import_cat1225g.json" ]; then
    if [ "$FILENAME" == "import_cat1225g.json" ] && [ ! -f "$FILEPATH" ]; then
       FILEPATH="import_cat1225g.json"
    fi
    
    echo "================================================================"
    echo "Processing $FILENAME..."
    echo "================================================================"
    node --dns-result-order=ipv4first scripts/manual_import.js "$FILEPATH" "$ORG_ID" "$USER_ID"
    echo ""
  else
    echo "File $FILEPATH not found, skipping."
  fi
done
