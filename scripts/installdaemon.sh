#!/bin/bash

# *** Optional
sudo touch /var/log/your_name_here.log
sudo chown ubuntu:ubuntu /var/log/your_name_here.log

# Set all params in 'config.json' file
sudo cp your_name_here /etc/init.d/
sudo update-rc.d your_name_here defaults

