Write-Host "Este script instalara la version {{tag}} del microservicio {{reponame}} 
en el namespace {{namespace}}

Antes de ejecutar este script:
* Debe estar instalado helm (https://get.helm.sh/helm-v3.5.2-windows-amd64.zip)
* Debe estar instalado kubectl de Azure, con 'Install-AzAksKubectl'
* Debe haberse ejecutado Connect-AzAccount

Presione cualquier tecla para continuar"
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown');
Write-Host "Iniciando"

helm upgrade --namespace {{namespace}} `
    --install --wait --debug `
    {{reponame}} {{chartPath}}