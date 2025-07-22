# 📊 MoonYetis Casino - Diagrama Completo del Sistema

## 🏗️ Arquitectura General del Sistema

```mermaid
graph TB
    subgraph "🌐 Frontend (Port 8080)"
        UI[🎮 MoonYetis Casino Interface]
        AM[🔐 Authentication Modal]
        WH[💰 Wallet Hub Modal]
        SM[🎰 Slot Machine Engine]
        WM[🔗 Wallet Manager]
    end
    
    subgraph "⚙️ Backend (Port 3002)"
        API[🚀 Express Server]
        AUTH[🔐 AuthManager]
        REF[👥 ReferralManager]
        DB[🗄️ SQLite Database]
        TM[📡 Transaction Monitor]
        PS[💹 Price Service]
    end
    
    subgraph "🌍 Servicios Externos"
        UNISAT[🔶 UniSat API]
        FB[₿ Fractal Bitcoin]
        WALLETS[💼 Wallets<br/>UniSat/OKX]
    end
    
    subgraph "💾 Base de Datos"
        USERS[👤 users]
        STREAKS[📅 login_streaks]
        REFERRALS[👥 referrals]
        REWARDS[🎁 reward_logs]
        TRANSACTIONS[💰 transactions]
    end

    %% Frontend Connections
    UI --> AM
    UI --> WH
    UI --> SM
    WH --> WM
    
    %% Frontend to Backend
    AM -.->|HTTP/JSON| AUTH
    WH -.->|HTTP/JSON| API
    SM -.->|HTTP/JSON| API
    WM -.->|HTTP/JSON| API
    
    %% Backend Internal
    API --> AUTH
    API --> REF
    API --> DB
    API --> TM
    API --> PS
    
    %% Database Relations
    AUTH --> USERS
    AUTH --> STREAKS
    REF --> REFERRALS
    AUTH --> REWARDS
    API --> TRANSACTIONS
    
    %% External Services
    PS -.->|Price Data| UNISAT
    TM -.->|Tx Monitor| FB
    WM -.->|Connect| WALLETS
    API -.->|Validate Tx| FB

    %% Styling
    classDef frontend fill:#4ECDC4,stroke:#333,stroke-width:2px
    classDef backend fill:#FF6B35,stroke:#333,stroke-width:2px
    classDef database fill:#FFE66D,stroke:#333,stroke-width:2px
    classDef external fill:#E8E8E8,stroke:#333,stroke-width:2px
    
    class UI,AM,WH,SM,WM frontend
    class API,AUTH,REF,TM,PS backend
    class USERS,STREAKS,REFERRALS,REWARDS,TRANSACTIONS database
    class UNISAT,FB,WALLETS external
```

## 🔐 Flujo de Autenticación Completo

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant F as 🌐 Frontend
    participant A as 🔐 AuthManager
    participant D as 🗄️ Database
    participant R as 👥 ReferralManager

    Note over U,R: Registro de Usuario
    U->>F: Abrir modal de registro
    U->>F: Llenar formulario + código referido
    F->>A: Validar código referido
    A->>D: Verificar código en tabla referrals
    D-->>A: Código válido/inválido
    A-->>F: Resultado validación
    F->>A: Enviar datos de registro
    A->>A: Hash password (bcrypt)
    A->>D: Crear usuario + código referido único
    A->>R: Crear relación de referido
    R->>D: Insertar en tabla referrals (status: pending)
    D-->>A: Usuario creado exitosamente
    A-->>F: Respuesta con código referido
    F-->>U: Mostrar éxito + código referido

    Note over U,R: Login y Recompensas Diarias
    U->>F: Login con credenciales
    F->>A: Enviar login request
    A->>D: Verificar credenciales
    A->>A: Verificar password (bcrypt)
    A->>D: Verificar última conexión
    A->>A: Calcular recompensa diaria
    
    alt Primera vez del día
        A->>D: Actualizar login_streaks
        A->>D: Crear reward_log (daily_login)
        A->>D: Incrementar balance usuario
        A-->>F: Login + recompensa diaria
        F-->>U: Mostrar login + reward notification
    else Ya logueado hoy
        A-->>F: Login sin recompensa
        F-->>U: Mostrar solo login exitoso
    end

    Note over U,R: Generación JWT y Sesión
    A->>A: Generar JWT token (7 días)
    A-->>F: Token + datos usuario
    F->>F: Guardar en localStorage
    F->>F: Actualizar UI estado auth
    F->>F: Disparar evento authStateChanged
```

## 👥 Sistema de Referidos Completo

```mermaid
flowchart TD
    subgraph "📝 Registro con Referido"
        A[Usuario ingresa código referido] --> B{Código válido?}
        B -->|Sí| C[Crear cuenta]
        B -->|No| D[Mostrar error]
        C --> E[Generar código propio MOONXXXX]
        C --> F[Crear relación referido status: pending]
    end
    
    subgraph "🛒 Primera Compra del Referido"
        G[Usuario referido hace primera compra] --> H[Detectar referral_id en usuario]
        H --> I{Referido existe y status pending?}
        I -->|Sí| J[Procesar recompensa]
        I -->|No| K[Continuar sin recompensa]
        J --> L[+30 MC al referrer]
        J --> M[Actualizar status: completed]
        J --> N[Crear reward_log tipo: referral]
        J --> O[Actualizar purchase_date]
    end
    
    subgraph "📊 Tracking y Estadísticas"
        P[Usuario consulta referidos] --> Q[getReferralStats]
        Q --> R[Calcular total referrals]
        Q --> S[Calcular successful referrals]
        Q --> T[Calcular total earned]
        Q --> U[Listar referidos con estado]
    end
    
    subgraph "🎁 Tipos de Recompensas"
        V[Recompensas Sistema] --> W[Daily Login: 5-10 MC]
        V --> X[Referral: 30 MC por compra]
        V --> Y[Manual: Admin rewards]
        W --> Z[reward_logs table]
        X --> Z
        Y --> Z
    end
    
    F --> G
    L --> P
    
    classDef process fill:#4ECDC4,stroke:#333,stroke-width:2px
    classDef reward fill:#FFE66D,stroke:#333,stroke-width:2px
    classDef decision fill:#FF6B35,stroke:#fff,stroke-width:2px
    
    class A,C,G,H,J,P,Q process
    class L,M,N,V,W,X,Y,Z reward
    class B,I decision
```

## 💰 Integración Wallet Hub y Compras

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant WH as 💰 Wallet Hub
    participant WM as 🔗 Wallet Manager
    participant API as 🚀 Backend API
    participant FB as ₿ Fractal Bitcoin
    participant DB as 🗄️ Database

    Note over U,DB: Conexión de Wallet
    U->>WH: Abrir Wallet Hub
    WH->>WM: Detectar wallets disponibles
    WM->>WM: Verificar UniSat/OKX
    U->>WH: Seleccionar wallet
    WH->>WM: Conectar wallet
    WM->>FB: Solicitar conexión
    FB-->>WM: Dirección wallet
    WM-->>WH: Wallet conectada
    WH-->>U: Mostrar conexión exitosa

    Note over U,DB: Compra de MoonCoins
    U->>WH: Seleccionar pack (300/600/1200 MC)
    U->>WH: Elegir método pago (FB/MY)
    WH->>API: POST /api/store/purchase
    API->>API: Generar dirección única
    API->>API: Calcular precio en tokens
    API->>DB: Crear orden pendiente
    API-->>WH: Dirección pago + cantidad
    WH-->>U: Mostrar QR + dirección

    Note over U,DB: Monitoreo de Transacción
    U->>FB: Enviar pago a dirección
    API->>FB: Monitorear transacciones
    FB-->>API: Tx detectada
    API->>API: Verificar cantidad/dirección
    API->>DB: Marcar orden como pagada
    
    alt Usuario tiene referrer
        API->>DB: Verificar si es primera compra
        API->>API: Procesar recompensa referido
        API->>DB: +30 MC al referrer
        API->>DB: Actualizar referral status
    end
    
    API->>DB: +MoonCoins al comprador
    API->>DB: Crear transaction record
    API-->>WH: Confirmación de pago
    WH-->>U: Mostrar MoonCoins recibidos

    Note over U,DB: Actualización de Balance
    WH->>API: GET /api/auth/profile
    API->>DB: Obtener balance actualizado
    DB-->>API: Balance + historial
    API-->>WH: Datos actualizados
    WH->>WH: Actualizar display balance
    WH-->>U: Mostrar nuevo balance
```

## 🗄️ Esquema de Base de Datos

```mermaid
erDiagram
    USERS {
        int id PK
        string username UK
        string email UK  
        string password_hash
        int mooncoins_balance
        string referral_code UK
        int referral_id FK
        string wallet_address
        datetime created_at
        datetime updated_at
    }
    
    LOGIN_STREAKS {
        int id PK
        int user_id FK
        int current_streak
        int total_logins
        datetime last_login_date
        int total_rewards_earned
        datetime created_at
        datetime updated_at
    }
    
    REFERRALS {
        int id PK
        int referrer_id FK
        int referred_id FK
        string status
        int reward_claimed
        datetime purchase_date
        int reward_amount
        datetime created_at
    }
    
    REWARD_LOGS {
        int id PK
        int user_id FK
        string type
        int amount
        string reason
        int streak_day
        int referral_id FK
        string metadata
        datetime created_at
    }
    
    TRANSACTIONS {
        int id PK
        int user_id FK
        string transaction_type
        int mooncoins_amount
        string crypto_amount
        string crypto_currency
        string transaction_hash
        string status
        string order_id
        datetime created_at
        datetime confirmed_at
    }

    USERS ||--o{ LOGIN_STREAKS : "has"
    USERS ||--o{ REFERRALS : "refers"
    USERS ||--o{ REFERRALS : "referred_by"
    USERS ||--o{ REWARD_LOGS : "receives"
    USERS ||--o{ TRANSACTIONS : "makes"
    REFERRALS ||--o{ REWARD_LOGS : "generates"
```

## 🔗 Mapa de APIs y Endpoints

```mermaid
flowchart LR
    subgraph "🔐 Authentication APIs"
        A1[POST /api/auth/register]
        A2[POST /api/auth/login] 
        A3[GET /api/auth/profile]
        A4[GET /api/auth/validate-referral/:code]
        A5[GET /api/auth/referrals]
        A6[POST /api/auth/daily-login]
    end
    
    subgraph "🛒 Store APIs"
        S1[GET /api/store/prices]
        S2[GET /api/store/products]
        S3[POST /api/store/purchase]
        S4[GET /api/store/order/:id]
        S5[POST /api/store/confirm-payment]
        S6[GET /api/store/balance/:wallet]
        S7[GET /api/store/transactions/:wallet]
        S8[GET /api/store/health]
    end
    
    subgraph "⚙️ Admin APIs"
        AD1[POST /api/admin/reward]
        AD2[GET /api/admin/stats]
        AD3[POST /api/admin/manual-confirm]
    end
    
    subgraph "🔗 Webhook APIs"
        W1[POST /api/webhook/unisat]
        W2[POST /api/webhook/fractal]
    end
    
    subgraph "🌐 Frontend Components"
        F1[Auth Modal]
        F2[Wallet Hub]
        F3[Slot Machine]
        F4[Admin Panel]
    end
    
    subgraph "🌍 External Services"
        E1[UniSat API]
        E2[Fractal Bitcoin]
        E3[Price Feeds]
    end
    
    %% Frontend to Auth APIs
    F1 --> A1
    F1 --> A2
    F1 --> A3
    F1 --> A4
    F1 --> A5
    
    %% Frontend to Store APIs
    F2 --> S1
    F2 --> S2
    F2 --> S3
    F2 --> S4
    F2 --> S6
    F2 --> S7
    F3 --> S6
    F3 --> S7
    
    %% Admin connections
    F4 --> AD1
    F4 --> AD2
    F4 --> AD3
    
    %% External webhooks
    E2 --> W1
    E2 --> W2
    
    %% External data feeds
    E1 --> S1
    E3 --> S1
    
    classDef auth fill:#4ECDC4,stroke:#333,stroke-width:2px
    classDef store fill:#FF6B35,stroke:#333,stroke-width:2px
    classDef admin fill:#FFE66D,stroke:#333,stroke-width:2px
    classDef webhook fill:#E8E8E8,stroke:#333,stroke-width:2px
    classDef frontend fill:#90EE90,stroke:#333,stroke-width:2px
    classDef external fill:#DDA0DD,stroke:#333,stroke-width:2px
    
    class A1,A2,A3,A4,A5,A6 auth
    class S1,S2,S3,S4,S5,S6,S7,S8 store
    class AD1,AD2,AD3 admin
    class W1,W2 webhook
    class F1,F2,F3,F4 frontend
    class E1,E2,E3 external
```

## 🎮 Flujo de Usuario Completo

```mermaid
journey
    title Experiencia Completa de Usuario MoonYetis
    
    section 🚀 Primer Contacto
      Visitar moonyetis.io: 5: Usuario
      Ver slot machine demo: 4: Usuario
      Decidir registrarse: 5: Usuario
    
    section 👤 Registro y Autenticación
      Clic en "Account": 5: Usuario
      Llenar formulario registro: 4: Usuario
      Ingresar código referido: 3: Usuario
      Validación en tiempo real: 5: Sistema
      Crear cuenta exitosa: 5: Usuario, Sistema
      Recibir código referido propio: 4: Usuario
    
    section 🎁 Primera Sesión
      Login primera vez: 5: Usuario
      Recibir 5 MC (día 1): 5: Usuario, Sistema
      Ver notificación bienvenida: 4: Usuario
      Explorar interfaz: 4: Usuario
    
    section 💰 Primera Compra
      Abrir Wallet Hub: 4: Usuario
      Conectar wallet FB: 3: Usuario, Wallet
      Seleccionar pack 300 MC: 5: Usuario
      Elegir pago con FB: 4: Usuario
      Escanear QR y pagar: 3: Usuario, Blockchain
      Confirmación automática: 5: Sistema
      Recibir 300 MC: 5: Usuario
      Si hay referrer: +30 MC: 5: Referrer
    
    section 🎰 Juego Regular
      Usar MoonCoins en slots: 5: Usuario
      Ganar/perder partidas: 3: Usuario
      Login diario por streak: 4: Usuario
      Día 7: +4 MC final: 4: Usuario, Sistema
      Reinicio ciclo rewards: 3: Sistema
    
    section 👥 Sistema Referidos
      Compartir código MOONXXXX: 4: Usuario
      Referido se registra: 5: Referido, Sistema
      Referido hace primera compra: 5: Referido
      Recibir 30 MC automático: 5: Usuario, Sistema
      Ver estadísticas referidos: 4: Usuario
    
    section 📈 Uso Avanzado
      Compras adicionales: 4: Usuario
      Retiros a wallet: 3: Usuario
      Historial transacciones: 4: Usuario
      Seguimiento rewards: 4: Usuario
```

## 📊 Resumen de Funcionalidades Implementadas

### ✅ **Sistema de Autenticación**
- Registro con username/email/password
- Login con JWT tokens (7 días)
- Validación de códigos de referido en tiempo real
- Sesiones persistentes con localStorage
- Logout completo con limpieza de estado

### ✅ **Sistema de Recompensas Diarias**
- Ciclo de 7 días: 5, 5, 8, 8, 10, 10, 4 MC = 50 MC total
- Reset automático si se rompe la racha
- Tracking completo en tabla login_streaks
- Notificaciones visuales en frontend

### ✅ **Sistema de Referidos**
- Códigos únicos formato MOONXXXX (8 chars)
- 30 MC por primera compra de referido
- Estados: pending → completed
- Estadísticas completas y tracking
- Validación en tiempo real

### ✅ **Wallet Hub Híbrido**
- Soporte para wallets UniSat/OKX
- Conexión a Fractal Bitcoin network
- Balance display (MY tokens, FB, MoonCoins)
- Compra de packs: 300, 600, 1200 MC
- Historial de transacciones
- Funciones de retiro (withdraw)

### ✅ **Base de Datos Completa**
- SQLite con better-sqlite3
- 5 tablas relacionadas
- Índices optimizados
- WAL mode para concurrencia
- Manejo de transacciones

### ✅ **APIs RESTful**
- 16 endpoints principales
- Autenticación JWT
- Validación de datos
- Manejo de errores
- Documentación de respuestas

### ✅ **Integración Blockchain**
- Precios en tiempo real (UniSat API)
- Monitoreo de transacciones
- Confirmaciones automáticas
- Soporte BRC-20 (MoonYetis)
- Fractal Bitcoin nativo

### ✅ **Frontend Responsivo**
- Modales con animaciones CSS
- Validación de formularios
- Estados de carga
- Notificaciones de sistema
- Diseño mobile-first

---

**🚀 Sistema completamente funcional listo para producción en el ecosistema Fractal Bitcoin**