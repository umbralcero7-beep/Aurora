# 📖 MANUAL DE USUARIO - AURORA OS

## Sistema de Gestión Integral para Gastronomía

---

## 1. INICIO DE SESIÓN

### 1.1 Primer Acceso
1. Acceder a la URL de Aurora
2. Si es la primera vez, hacer clic en **"Crear Perfil"**
3. Ingresar email corporativo (debe estar en lista blanca)
4. Crear contraseña segura (mínimo 8 caracteres, mayúsculas, minúsculas, números y carácter especial)
5. Mantener sesión activa o no según preferencia

### 1.2 Ingreso Normal
1. Ingresar email y contraseña
2. Si tiene 2FA habilitado, ingresar código de 6 dígitos
3. El sistema redireccionará según el rol:
   - **ADMIN/SUPPORT**: Dashboard
   - **WAITER**: Órdenes/Comandas
   - **RECEPTIONIST**: Domicilios
   - **HR**: Gestión de Personal

---

## 2. DASHBOARD (Página Principal)

### 2.1 Información General
- **Recaudo de Sesión**: Total de ventas del día
- **Estado Fiscal**: Muestra si hay ventas activas o sesión limpia
- **Último Cierre Z**: Número del último cierre

### 2.2 Alertas de Inventario
- Shows productos con stock bajo o agotado
- Click en **"Reordenar"** para gestionar

### 2.3 Cero Command
- Asistente de IA integrado
- Estado de conexión (Online/Offline)

---

## 3. MÓDULO DE ÓRDENES / COMANDAS

### 3.1 Crear Nueva Orden
1. Hacer clic en **"+ Nueva Orden"**
2. Seleccionar mesa (si aplica)
3. Buscar y agregar productos del menú
4. Ajustar cantidades con **+** y **-**
5. Agregar notas especiales si es necesario
6. Click en **"Enviar a Cocina"**

### 3.2 Estados de Orden
- **Pendiente**: Orden recibida, esperando preparación
- **En Preparación**: Cocina trabajando en ella
- **Lista**: Lista para servir/entregar
- **Entregada**: Completada

### 3.3 Acciones
- **Editar**: Modificar orden antes de confirmar
- **Cancelar**: Anular orden (requiere motivo)

---

## 4. PUNTO DE VENTA (POS)

### 4.1 Realizar Venta
1. Seleccionar productos del menú
2. Aplicar descuentos si aplica (%)
3. Seleccionar método de pago:
   - Efectivo
   - Tarjeta Débito/Crédito
   - Transferencia
   - Pago mixto (combinación de métodos)
4. Seleccionar si incluye **propina** (opcional)
5. Click en **"Cobrar"**

### 4.2 Generación de Factura
- Se genera automáticamente con:
  - Número de factura secuencial
  - Código QR de validación DIAN
  - Información del establecimiento
  - Detalle de productos y precios

### 4.3 Cierre de Caja (Paso a Paso)
1. **Verificar Inicio**: Confirmar monto base de apertura
2. **Contar Efectivo**: Ingresar cantidad física en caja
3. **Detalle Métodos**: Desglose por tipo de pago
4. **Resumen Ventas**: Comparar esperado vs real
5. **Confirmar Cierre**: Generar Reporte Z

---

## 5. MENÚ (Gestión de Productos)

### 5.1 Agregar Producto
1. Ir a **Menú** → **"+"**
2. Completar datos:
   - Nombre del producto
   - Precio
   - Categoría
   - Descripción (opcional)
   - Imagen (opcional)
3. Toggle **"Disponible"** para activar
4. Click en **"Guardar"**

### 5.2 Editar/Eliminar
1. Buscar producto en la lista
2. Click en **editar** (lápiz) o **eliminar** (basurero)

---

## 6. INVENTARIO Y SUMINISTROS

### 6.1 Pestañas del Sistema
- **La Carta**: Productos del menú (solo lectura)
- **Insumos ERP**: Materias primas y productos
- **Proveedores**: Información de proveedores
- **Logística**: Gestión de pedidos

### 6.2 Agregar Insumo
1. Click en **"Inyectar Insumo"**
2. Cargar archivo Excel con datos:
   - Nombre del insumo
   - SKU
   - Unidad de medida
   - Costo
   - Stock actual
   - Categoría
3. El sistema analiza automáticamente
4. Click en **"Ejecutar Sincronización"**

### 6.3 Seguimiento de Stock
- Productos con stock bajo se marcan en rojo
- Alertas aparecen en Dashboard

---

## 7. DOMICILIOS

### 7.1 Registrar Nuevo Domicilio
1. Click en **"+"**
2. Ingresar datos del cliente:
   - Nombre
   - Teléfono
   - Dirección
3. Buscar productos del menú
4. Agregar al pedido
5. Indicar costo de envío
6. Click en **"Despachar e Imprimir"**

### 7.2 Estados
- **Pendiente**: Recién creado
- **En Camino**: En proceso de entrega
- **Entregado**: Completado exitosamente
- **Anulado**: Cancelado (requiere motivo)

### 7.3 Impresión (Restringido)
- usuarios no-admin deben ingresar contraseña de ADMIN
- Imprime 2 copias: Domiciliario y Recepción

---

## 8. REPORTES

### 8.1 Tipos de Reportes
- **Ventas por Día**: Resumen de ingresos
- **Productos Más Vendidos**: Ranking de popularidad
- **Métodos de Pago**: Desglose por tipo
- **Domicilios**: Estado de entregas
- **Detallado**: Vista completa con filtros

### 8.2 Exportar
- **Excel**: Click en ícono de descarga
- **PDF**: Click en botón de imprimir

---

## 9. CONTROL FISCAL

### 9.1 Generar Reporte X (Parcial)
1. Click en **"Reporte Parcial (X)"**
2. Muestra ventas desde último cierre
3. No cierra la sesión

### 9.2 Generar Reporte Z (Cierre)
1. Click en **"Cerrar Jornada (Z)"**
2. Completar los 5 pasos de cierre
3. Confirmar para generar cierre definitivo
4. El sistema hace logout automáticamente

### 9.3 Para Super Usuario
- Puede seleccionar cualquier sede
- Puede generar Reporte Z de cualquier établissement

---

## 10. CONFIGURACIÓN

### 10.1 Gestión de Usuarios (Solo ADMIN/SUPPORT)
1. Ir a **Settings → Equipo**
2. Click en **"Nuevo Personal"**
3. Completar:
   - Email corporativo
   - Nombre
   - Rol (WAITER, CASHIER, ADMIN, etc.)
   - Sede asignada
4. Click en **"Confirmar"**

### 10.2 Cambiar Contraseña de Usuario (Solo Super Usuario)
1. En lista de usuarios, hacer click en ícono de **llave**
2. Ingresar nueva contraseña
3. Click en **"Actualizar Contraseña"**

### 10.3 Gestión de Sedes (Solo Super Usuario)
1. Ir a **Settings → Sedes**
2. Agregar/editar establecimientos

### 10.4 Perfil Personal
1. Ir a **Settings → Perfil**
2. Cambiar contraseña propia
3. Configurar 2FA (autenticación de dos factores)

---

## 11. SEGURIDAD Y AUTENTICACIÓN

### 11.1 Autenticación de Dos Factores (2FA)
**Setup:**
1. Ir a **Settings → Perfil**
2. Buscar sección **"Autenticación de Dos Factores"**
3. Click en **"Configurar 2FA"**
4. Escanearel QR con Google Authenticator o Authy
5. Ingresar código de verificación para activar

**Usar 2FA:**
1. Ingresar email y contraseña
2. Ingresar código de 6 dígitos de la app
3. También puede usar códigos de respaldo (8 códigos)

### 11.2 Rate Limiting
- Después de 5 intentos fallidos, bloqueo por 15 minutos
- Previene ataques de fuerza bruta

---

## 12. RECURSOS HUMANOS (HR)

### 12.1 Agregar Colaborador
1. Ir a **HR**
2. Click en **"Vincular Colaborador"**
3. Completar datos:
   - Nombre completo
   - Tipo de contrato
   - Fecha de ingreso
   - Salario base
   - KPI de desempeño

### 12.2 Control de Nómina
- Ver costo total de nómina
- Comparar con períodos anteriores

---

## 13. INTELIGENCIA ARTIFICIAL (AI)

### 13.1 Módulos Disponibles
- **Detección de Anomalías**: Identifica patrones irregulares
- **Predicción de Demanda**: Pronostica ventas futuras
- **Análisis de Inventario**: Recomendaciones de stock

### 13.2 Usar AI
1. Ir al módulo correspondiente
2. Click en **"Ejecutar Análisis"**
3. Revisar resultados y recomendaciones

---

## 14. FUNCIONES AVANZADAS

### 14.1 Modo Offline
- El sistema puede funcionar sin internet
- Sincroniza automáticamente al reconectar

### 14.2 Exportación de Datos
- Excel para análisis externo
- PDF para reportes físicos

### 14.3 Notificaciones
- Alertas de stock bajo
- Notificaciones de pedidos

---

## 15. GLOSARIO DE ROLES

| Rol | Descripción |
|-----|-------------|
| **ADMIN** | Acceso completo, gestión de usuarios y configuración |
| **SUPPORT** | Soporte técnico, acceso a todas las sedes |
| **CASHIER** | Punto de venta, cobros y facturas |
| **WAITER** | Órdenes y comandas |
| **RECEPTIONIST** | Domicilios y atención al cliente |
| **CHEF** | Cocina, gestión de órdenes |
| **HR** | Gestión de personal y nómina |
| **FINANCE** | Reportes y análisis financiero |
| **INVENTORY** | Gestión de inventarios |

---

## 16. SOLUCIÓN DE PROBLEMAS

### 16.1 Error de Login
- Verificar credenciales
- Comprobar conexión a internet
- Verificar si el email está en lista blanca

### 16.2 No Carga el Menú
- Refrescar la página
- Verificar conexión a Firebase

### 16.3 Factura no Genera
- Verificar que el POS esté correctamente inicializado
- Revisar configuración de resolución DIAN

### 16.4 Stock No Actualiza
- Verificar que el producto esté relacionado con el insumo correcto

---

## 17. CONTACTO Y SOPORTE

Para dudas o problemas:
- Email: umbralcero7@gmail.com
- Soporte técnico: Configurable según implementación

---

**Aurora OS v4.5** - Sistema de Gestión de Alto Rendimiento
*Umbral Cero - Tecnología de Precisión*