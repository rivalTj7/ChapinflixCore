#!/bin/bash

# Script para actualizar URLs del frontend de ChapinFlix
# De: https://34.10.139.168.nip.io
# A: http://34.135.146.173.nip.io

echo "🔄 Actualizando URLs del frontend de ChapinFlix..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "app" ]; then
    echo -e "${RED}❌ Error: No se encuentra el directorio 'app'. Asegúrate de estar en la raíz del proyecto Next.js${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 Directorio actual: $(pwd)${NC}"
echo ""

# Hacer backup
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}💾 Creando backup en: $BACKUP_DIR${NC}"
mkdir -p "$BACKUP_DIR"
cp -r app "$BACKUP_DIR/"
echo -e "${GREEN}✅ Backup creado${NC}"
echo ""

# Contador de archivos modificados
count=0

# 1. Actualizar URL base (https -> http y cambio de IP)
echo -e "${YELLOW}🔧 Actualizando URLs base...${NC}"
files=$(find app -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null)

for file in $files; do
    if grep -q "34.10.139.168" "$file" 2>/dev/null; then
        sed -i.bak 's|https://34.10.139.168.nip.io|http://34.135.146.173.nip.io|g' "$file"
        rm "${file}.bak" 2>/dev/null
        echo "  ✓ $file"
        ((count++))
    fi
done

echo -e "${GREEN}✅ URLs base actualizadas${NC}"
echo ""

# 2. Corregir typo: ususarios -> usuarios
echo -e "${YELLOW}🔧 Corrigiendo typo 'ususarios' -> 'usuarios'...${NC}"
typo_count=0

for file in $files; do
    if grep -q "ususarios" "$file" 2>/dev/null; then
        sed -i.bak 's|/ususarios/|/usuarios/|g' "$file"
        rm "${file}.bak" 2>/dev/null
        echo "  ✓ $file"
        ((typo_count++))
    fi
done

echo -e "${GREEN}✅ Typos corregidos${NC}"
echo ""

# 3. Verificar que no queden URLs antiguas
echo -e "${YELLOW}🔍 Verificando URLs antiguas restantes...${NC}"
old_urls=$(grep -r "34.10.139.168" app --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
old_typos=$(grep -r "ususarios" app --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)

if [ "$old_urls" -gt 0 ]; then
    echo -e "${RED}⚠️  Se encontraron $old_urls referencias a la URL antigua:${NC}"
    grep -r "34.10.139.168" app --include="*.tsx" --include="*.ts" 2>/dev/null
    echo ""
else
    echo -e "${GREEN}✅ No se encontraron URLs antiguas${NC}"
fi

if [ "$old_typos" -gt 0 ]; then
    echo -e "${RED}⚠️  Se encontraron $old_typos referencias a 'ususarios':${NC}"
    grep -r "ususarios" app --include="*.tsx" --include="*.ts" 2>/dev/null
    echo ""
else
    echo -e "${GREEN}✅ No se encontraron typos de 'ususarios'${NC}"
fi

echo ""

# 4. Verificar nuevas URLs
echo -e "${YELLOW}🔍 Verificando nuevas URLs...${NC}"
new_urls=$(grep -r "34.135.146.173" app --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Se encontraron $new_urls referencias a la nueva URL${NC}"
echo ""

# Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ RESUMEN DE CAMBIOS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  📝 Archivos modificados (URLs): ${GREEN}$count${NC}"
echo -e "  📝 Archivos modificados (typos): ${GREEN}$typo_count${NC}"
echo -e "  🆕 Referencias a nueva URL: ${GREEN}$new_urls${NC}"
echo -e "  ⚠️  URLs antiguas restantes: ${RED}$old_urls${NC}"
echo -e "  ⚠️  Typos restantes: ${RED}$old_typos${NC}"
echo -e "  💾 Backup guardado en: ${YELLOW}$BACKUP_DIR${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Mapeo de servicios
echo -e "${YELLOW}📋 MAPEO DE SERVICIOS:${NC}"
echo "  • Auth (8000):         /auth/*"
echo "  • Inventario (8001):   /inventario/*"
echo "  • Usuarios (8002):     /usuarios/*"
echo "  • Pago (8005):         /pago/*"
echo "  • Ver Catálogo (8010): /vercatalogo/*"
echo "  • Ver Peli (8020):     /verpeli/*"
echo ""

# Archivos principales afectados
echo -e "${YELLOW}📄 ARCHIVOS PRINCIPALES ACTUALIZADOS:${NC}"
echo "  • app/lib/auth.ts"
echo "  • app/login/page.tsx"
echo "  • app/catalog/page.tsx"
echo "  • app/admin/page.tsx"
echo "  • app/subscription/page.tsx"
echo "  • app/upload/page.tsx"
echo "  • app/verify-email/page.tsx"
echo ""

# Próximos pasos
echo -e "${YELLOW}🚀 PRÓXIMOS PASOS:${NC}"
echo "  1. Revisar los cambios: git diff"
echo "  2. Probar el frontend localmente: npm run dev"
echo "  3. Verificar que todos los endpoints respondan correctamente"
echo "  4. Si todo funciona, hacer commit: git add . && git commit -m 'feat: actualizar URLs a nuevo cluster'"
echo ""

if [ "$old_urls" -gt 0 ] || [ "$old_typos" -gt 0 ]; then
    echo -e "${RED}⚠️  ATENCIÓN: Se encontraron referencias antiguas. Revisa manualmente los archivos listados arriba.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ ¡Actualización completada exitosamente!${NC}"
    exit 0
fi