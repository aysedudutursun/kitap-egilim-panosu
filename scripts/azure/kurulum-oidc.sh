#!/usr/bin/env bash
# Okuma Pusulası — Azure ilk kurulum (bir kez, Azure Cloud Shell'de çalıştırılır)
#
# Ne yapar?
#   1. Kaynak grubunu oluşturur (tüm proje kaynakları bunun içinde; silmek tek komut).
#   2. GitHub Actions için bir uygulama kimliği (service principal) oluşturur.
#   3. GitHub'a ŞİFRESİZ/ANAHTARSIZ erişim verir (OIDC federasyonu):
#      yalnızca bu deponun main dalından çalışan iş akışları token alabilir.
#   4. Bu kimliğe sadece bu kaynak grubunda yetki verir (en az ayrıcalık).
#
# Hiçbir gizli anahtar/şifre üretmez. Sonunda yazdırdığı 3 kimlik numarası gizli değildir.
set -euo pipefail

REPO="aysedudutursun/kitap-egilim-panosu"
RG="rg-okuma-pusulasi"
KONUM="westeurope"
UYGULAMA="gh-okuma-pusulasi-oidc"

adim() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }

adim "Abonelik kontrol ediliyor"
SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
az account show --query "{abonelik:name, durum:state}" -o table

adim "Gerekli kaynak sağlayıcıları kaydediliyor (Storage, Web)"
az provider register --namespace Microsoft.Storage -o none
az provider register --namespace Microsoft.Web -o none

adim "Kaynak grubu: $RG ($KONUM)"
az group create --name "$RG" --location "$KONUM" --tags proje=okuma-pusulasi -o none
RG_ID=$(az group show --name "$RG" --query id -o tsv)

adim "Uygulama kimliği: $UYGULAMA"
APP_ID=$(az ad app list --display-name "$UYGULAMA" --query "[0].appId" -o tsv)
if [ -z "$APP_ID" ]; then
  APP_ID=$(az ad app create --display-name "$UYGULAMA" --query appId -o tsv)
fi
SP_OID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)
if [ -z "$SP_OID" ]; then
  SP_OID=$(az ad sp create --id "$APP_ID" --query id -o tsv)
fi

adim "GitHub OIDC güveni (yalnızca $REPO, main dalı)"
if ! az ad app federated-credential list --id "$APP_ID" --query "[?name=='github-main'].name" -o tsv | grep -q github-main; then
  az ad app federated-credential create --id "$APP_ID" --parameters "{
    \"name\": \"github-main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${REPO}:ref:refs/heads/main\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" -o none
fi

adim "Yetkiler (yalnızca $RG kaynak grubunda)"
for ROL in "Contributor" "Storage Blob Data Contributor"; do
  if [ -z "$(az role assignment list --assignee "$SP_OID" --scope "$RG_ID" --role "$ROL" --query "[0].id" -o tsv)" ]; then
    # Yeni oluşturulan kimliğin dizinde görünmesi birkaç saniye sürebilir; birkaç kez dene.
    for DENEME in 1 2 3 4 5 6; do
      if az role assignment create --assignee-object-id "$SP_OID" --assignee-principal-type ServicePrincipal \
           --role "$ROL" --scope "$RG_ID" -o none 2>/dev/null; then break; fi
      echo "  bekleniyor ($DENEME/6)..."; sleep 10
      [ "$DENEME" = 6 ] && { echo "Rol atanamadı: $ROL"; exit 1; }
    done
  fi
  echo "  ✓ $ROL"
done

adim "TAMAM — aşağıdaki 3 satırı kopyalayıp Claude'a gönder (gizli bilgi değildir)"
echo "AZURE_CLIENT_ID=$APP_ID"
echo "AZURE_TENANT_ID=$TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID=$SUB_ID"
