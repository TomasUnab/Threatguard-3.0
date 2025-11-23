#!/usr/bin/env bash
# generate_traffic.sh - generate traffic to trigger Snort ALL TRAFFIC rule
# Run inside any container on the same Docker network (e.g., frontend)

# TCP request to API (port 8000)
curl -s -o /dev/null http://threatguard-api:8000 || true

# ICMP ping to Snort container
ping -c 3 threatguard-snort || true

# UDP packet using netcat (send empty payload to port 53)
nc -u -w1 threatguard-snort 53 </dev/null || true
