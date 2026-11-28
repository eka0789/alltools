[CmdletBinding()]
param(
    [string]$ApiUrl = $env:LOCALDEPLOY_API_URL,
    [string]$AppId = $env:LOCALDEPLOY_APP_ID,
    [string]$Token = $env:LOCALDEPLOY_TOKEN,
    [int]$TimeoutMinutes = 45,
    [int]$PollSeconds = 10
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    throw "Missing LOCALDEPLOY_API_URL (GitHub repository variable). Example: http://127.0.0.1:8000"
}
if ([string]::IsNullOrWhiteSpace($AppId)) {
    throw "Missing LOCALDEPLOY_APP_ID (GitHub repository variable)."
}
if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "Missing LOCALDEPLOY_TOKEN (GitHub repository secret)."
}

$ApiUrl = $ApiUrl.TrimEnd('/')
$headers = @{ Authorization = "Bearer $Token" }

Write-Host "[deploy] Requesting deployment for app $AppId via $ApiUrl ..."

$created = $null
$detail = ""
$delays = @(5, 15)
for ($attempt = 1; $attempt -le ($delays.Count + 1); $attempt++) {
    if ($attempt -gt 1) {
        Write-Host "[deploy] Request failed (attempt $attempt of $($delays.Count + 1)); retrying in $($delays[$attempt - 2])s ..."
        Start-Sleep -Seconds $delays[$attempt - 2]
    }
    try {
        $created = Invoke-RestMethod -Method Post `
            -Uri "$ApiUrl/api/applications/$AppId/deploy" `
            -Headers $headers `
            -ContentType "application/json" `
            -Body "{}"
        break
    } catch {
        $detail = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $detail = $reader.ReadToEnd()
            } catch { }
        }
        Write-Host "[deploy] Deploy request failed: $detail"
    }
}
if ($null -eq $created) {
    throw "Failed to request deployment after $($delays.Count + 1) attempts: $detail"
}

$deploymentId = $created.deployment_id
if ([string]::IsNullOrWhiteSpace($deploymentId)) {
    throw "LocalDeploy did not return a deployment_id: $($created | ConvertTo-Json -Compress)"
}
Write-Host "[deploy] Deployment queued: $deploymentId"

$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$lastStatus = ""
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds $PollSeconds

    try {
        $deployment = Invoke-RestMethod -Method Get `
            -Uri "$ApiUrl/api/deployments/$deploymentId" `
            -Headers $headers
    } catch {
        Write-Host "[deploy] Poll failed, retrying: $($_.Exception.Message)"
        continue
    }

    $status = [string]$deployment.status
    if ($status -ne $lastStatus) {
        Write-Host "[deploy] status: $status"
        $lastStatus = $status
    }

    if ($status -eq "success") {
        Write-Host "[deploy] Deployed commit $($deployment.git_commit_sha) on branch $($deployment.git_branch)"
        Write-Host "[deploy] Message: $($deployment.git_message)"
        Write-Host "[deploy] Image: $($deployment.image_tag)"
        exit 0
    }

    if ($status -eq "failed" -or $status -eq "cancelled" -or $status -eq "error") {
        Write-Host "[deploy] Deployment $status. Error: $($deployment.error_message)"
        try {
            $logs = Invoke-RestMethod -Method Get `
                -Uri "$ApiUrl/api/deployments/$deploymentId/logs" `
                -Headers $headers
            Write-Host "[deploy] Last build log lines:"
            foreach ($line in (@($logs) | Select-Object -Last 40)) {
                $message = if ($null -ne $line.message) { $line.message } else { [string]$line }
                Write-Host "  $message"
            }
        } catch {
            Write-Host "[deploy] Could not fetch build logs: $($_.Exception.Message)"
        }
        exit 1
    }
}

throw "Timed out after $TimeoutMinutes minutes waiting for deployment $deploymentId (last status: '$lastStatus')."
