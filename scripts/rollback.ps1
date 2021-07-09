Write-Host "Este script hara rollback al revision anterior 
del microservicio {{reponame}} en el namespace {{namespace}}

Si no hay version anterior, se desinstalara el microservicio

Antes de ejecutar este script:
* Debe estar instalado helm (https://get.helm.sh/helm-v3.5.2-windows-amd64.zip)
* Debe estar instalado kubectl de Azure, con 'Install-AzAksKubectl'
* Debe haberse ejecutado Connect-AzAccount

Presione cualquier tecla para continuar"
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown');
Write-Host "Iniciando"

$jsonHistory = & helm history {{reponame}} --namespace={{namespace}} -o json
if ( $LASTEXITCODE -ne 0 )
{    
    Write-Host "Error: no pudo obtenerse la historia en helm del release {{reponame}}. Rollback cancelado"
    exit    
}

$history = $jsonHistory | ConvertFrom-Json
if ( $history.Count -eq 1 ) {
    Write-Host "No hay revision previa. Se desinstalara la unica revision existente"
    helm uninstall {{reponame}} --namespace={{namespace}} 
} else {
    Write-Host "Ejecutando rollback"
    helm rollback {{reponame}} --namespace={{namespace}}
    Write-Host "Historial instalaciones:"
    helm history {{reponame}} --namespace={{namespace}}
}

