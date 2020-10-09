#!/bin/bash

pm2 stop 01-ne || true
pm2 start build/pm2_local.yaml
