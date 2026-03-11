#!/bin/bash
echo "Booting Sovereign Companion Setup..."
cd "$(dirname "$0")/shared/integrator"
npm install
npm run setup