module.exports = {
  apps: [
    {
      name: "osrm-routed",
      script: "/usr/local/bin/osrm-routed",
      args: "--algorithm mld /opt/osrm/build/west-balkan-core.osrm",
      cwd: "/opt/osrm/build",
      instances: 1,
      autorestart: true,
      time: true,
    },
  ],
};
