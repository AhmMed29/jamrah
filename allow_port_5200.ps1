# Run this script as Administrator to allow Jamrah PC app to communicate with the Android app over Wi-Fi
Write-Host "Adding Windows Firewall rule for port 5200..."
New-NetFirewallRule -DisplayName "Jamrah Mobile Sync (TCP 5200)" -Direction Inbound -LocalPort 5200 -Protocol TCP -Action Allow
Write-Host "Firewall rule added successfully! Your Android app can now connect."
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
