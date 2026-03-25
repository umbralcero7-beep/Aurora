
export type Language = 'en' | 'es';

export const translations = {
  en: {
    nav: {
      dashboard: "Home",
      pos: "POS",
      waiterOrders: "Orders",
      menu: "Menu",
      products: "Supplies",
      orders: "Kitchen",
      deliveries: "Deliveries",
      invoices: "Invoices",
      reports: "Reports",
      settings: "Settings",
      users: "Team",
      hr: "Talent Management",
      profile: "Profile",
      logout: "Exit",
      management: "Admin",
      philosophy: "Vision",
      fiscalControl: "Tax Control",
      customers: "Customers",
      marketplace: "Extensions",
      help: "Help Center"
    },
    hr: {
      title: "Deep HR • Talent Management",
      subtitle: "High-performance team coordination and payroll auditing.",
      totalStaff: "Total Collaborators",
      activeContracts: "Active Contracts",
      performanceAvg: "Team Performance",
      addStaff: "Onboard Collaborator",
      fullName: "Full Name",
      contract: "Contract Type",
      entryDate: "Hire Date",
      salary: "Base Salary",
      performance: "KPI Performance",
      status: "Operational Status",
      documents: "Internal Records",
      ceroInsight: "Cero HR Analyst",
      payrollTitle: "Payroll Control",
      totalPayroll: "Monthly Payroll Cost",
      payrollAudit: "Salaries Audit"
    },
    inventory: {
      title: "Inventory & Supplies",
      subtitle: "Manage your ingredients and general expenses.",
      tabs: {
        menu: "Menu Items",
        supplies: "Raw Materials",
        expenses: "Bills & Repairs"
      },
      expenses: {
        add: "Record Bill",
        description: "What was bought?",
        amount: "Total Cost",
        category: "Type",
        date: "Date",
        list: "Expense Log"
      }
    },
    deliveries: {
      title: "Deliveries",
      subtitle: "Fast tracking for external orders.",
      register: "New Delivery",
      phone: "Phone Number",
      address: "Delivery Address",
      customer: "Guest Name",
      status: "Status",
      pending: "Pending",
      onWay: "On Way",
      delivered: "Delivered",
      total: "Total",
      notes: "Additional Notes"
    },
    crm: {
      title: "Loyalty CRM",
      subtitle: "Understand your guests and maximize loyalty.",
      vip: "VIP Guest",
      points: "Points Balance",
      visits: "Visits",
      lastVisit: "Last Visit",
      topCustomers: "Priority Guests"
    },
    marketplace: {
      title: "Extensions Marketplace",
      subtitle: "Scale Aurora with professional integrations.",
      onlyAdmin: "Access restricted to Admin & Support only.",
      install: "Activate",
      installed: "Active"
    },
    profile: {
      title: "My Profile",
      role: "Assigned Role",
      status: "Account Status",
      note: "Your profile is monitored for security purposes.",
      security: "Account Security",
      changePassword: "Change Password",
      newPassword: "New Password",
      confirmPassword: "Confirm Password",
      updateBtn: "Update Credentials",
      passwordSuccess: "Password updated successfully.",
      passwordError: "Could not update password. Try logging in again."
    },
    login: {
      keepSession: "Stay Logged In",
      corporateAccess: "Corporate Access",
      welcome: "Welcome to Aurora"
    },
    common: {
      search: "Find something...",
      filter: "Filter",
      export: "Export Excel",
      import: "Import Excel",
      save: "Save",
      cancel: "Cancel",
      language: "Language",
      english: "English",
      spanish: "Spanish",
      new: "Add New",
      loading: "Loading...",
      stayConnected: "Stay Logged In",
      syncing: "Cloud Syncing...",
      synced: "Data Synced"
    }
  },
  es: {
    nav: {
      dashboard: "Inicio",
      pos: "POS",
      waiterOrders: "Comandas",
      menu: "Carta",
      products: "Insumos",
      orders: "Cocina",
      deliveries: "Domicilios",
      invoices: "Facturas",
      reports: "Reportes",
      settings: "Ajustes",
      users: "Personal",
      hr: "Talento Humano",
      profile: "Mi Perfil",
      logout: "Salir",
      management: "Gestión",
      philosophy: "Visión",
      fiscalControl: "Control Fiscal",
      customers: "Clientes",
      marketplace: "Extensiones",
      help: "Centro de Ayuda"
    },
    hr: {
      title: "Deep HR • Talento Humano",
      subtitle: "Coordinación de equipos de alto rendimiento y auditoría de nómina.",
      totalStaff: "Colaboradores Totales",
      activeContracts: "Contratos Activos",
      performanceAvg: "Desempeño Equipo",
      addStaff: "Vincular Colaborador",
      fullName: "Nombre Completo",
      contract: "Tipo de Contrato",
      entryDate: "Fecha de Ingreso",
      salary: "Salario Base",
      performance: "KPI Desempeño",
      status: "Estado Operativo",
      documents: "Expediente Interno",
      ceroInsight: "Analista Cero HR",
      payrollTitle: "Control de Nómina",
      totalPayroll: "Costo de Nómina Mensual",
      payrollAudit: "Auditoría Salarial"
    },
    inventory: {
      title: "Inventario e Insumos",
      subtitle: "Gestiona ingredientes y gastos generales del local.",
      tabs: {
        menu: "Platos y Bebidas",
        supplies: "Materia Prima",
        expenses: "Gastos y Compras"
      },
      expenses: {
        add: "Registrar Gasto",
        description: "¿Qué se compró o reparó?",
        amount: "Costo Total",
        category: "Categoría",
        date: "Fecha",
        list: "Historial de Gastos"
      }
    },
    deliveries: {
      title: "Gestión de Domicilios",
      subtitle: "Rastreo rápido de pedidos externos.",
      register: "Nuevo Domicilio",
      phone: "Número Telefónico",
      address: "Dirección de Entrega",
      customer: "Nombre del Cliente",
      status: "Estado",
      pending: "Pendiente",
      onWay: "En Camino",
      delivered: "Entregado",
      total: "Total Comanda",
      notes: "Notas de Entrega"
    },
    crm: {
      title: "Fidelización CRM",
      subtitle: "Entiende a tus comensales y maximiza la lealtad.",
      vip: "Cliente VIP",
      points: "Balance de Puntos",
      visits: "Visitas",
      lastVisit: "Última Visit",
      topCustomers: "Invitados Prioritarios"
    },
    marketplace: {
      title: "Marketplace de Extensiones",
      subtitle: "Escala Aurora con integraciones profesionales.",
      onlyAdmin: "Acceso exclusivo para Admin y Soporte.",
      install: "Activar",
      installed: "Activa"
    },
    profile: {
      title: "Mi Perfil",
      role: "Rol Asignado",
      status: "Estado de Cuenta",
      note: "Tu perfil es monitoreado por motivos de seguridad.",
      security: "Seguridad de Acceso",
      changePassword: "Cambiar Contraseña",
      newPassword: "Nueva Contraseña",
      confirmPassword: "Confirmar Contraseña",
      updateBtn: "Actualizar Credenciales",
      passwordSuccess: "Contraseña actualizada con éxito.",
      passwordError: "No se pudo actualizar. Intenta iniciar sesión de nuevo."
    },
    login: {
      keepSession: "Mantener Sesión",
      corporateAccess: "Acceso Corporativo",
      welcome: "Bienvenido a Aurora"
    },
    common: {
      search: "Buscar...",
      filter: "Filtros",
      export: "Bajar Excel",
      import: "Subir Excel",
      save: "Guardar",
      cancel: "Cancelar",
      language: "Idioma",
      english: "Inglés",
      spanish: "Español",
      new: "Nuevo",
      loading: "Cargando...",
      stayConnected: "Mantener Sesión",
      syncing: "Sincronizando...",
      synced: "Datos Sincronizados"
    }
  }
};
