# Flutter Client Architecture

## **Project Structure**

mofe_waiter/
├── lib/
│   ├── main.dart
│   ├── config/
│   │   ├── theme.dart
│   │   └── constants.dart
│   ├── models/
│   │   ├── order.dart
│   │   ├── order_item.dart
│   │   ├── menu_item.dart
│   │   ├── session.dart
│   │   └── websocket_event.dart
│   ├── services/
│   │   ├── api_service.dart
│   │   ├── auth_service.dart
│   │   ├── websocket_service.dart
│   │   ├── offline_queue_service.dart
│   │   └── storage_service.dart
│   ├── providers/
│   │   ├── auth_provider.dart
│   │   ├── orders_provider.dart
│   │   ├── menu_provider.dart
│   │   └── connectivity_provider.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   └── login_screen.dart
│   │   ├── orders/
│   │   │   ├── orders_list_screen.dart
│   │   │   ├── order_detail_screen.dart
│   │   │   └── create_order_screen.dart
│   │   └── menu/
│   │       └── menu_browser_screen.dart
│   ├── widgets/
│   │   ├── order_card.dart
│   │   ├── order_item_tile.dart
│   │   ├── status_badge.dart
│   │   └── connectivity_banner.dart
│   └── utils/
│       ├── validators.dart
│       └── formatters.dart
├── test/
├── pubspec.yaml
└── README.md


---

## **Core Dependencies**

```yaml
# pubspec.yaml
name: mofe_waiter
description: mofé waiter ordering client
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_riverpod: ^2.5.1
  
  # Networking
  dio: ^5.4.3
  web_socket_channel: ^2.4.5
  connectivity_plus: ^6.0.3
  
  # Local Storage
  drift: ^2.16.0
  sqlite3_flutter_libs: ^0.5.20
  path_provider: ^2.1.3
  path: ^1.9.0
  
  # Secure Storage (auth tokens)
  flutter_secure_storage: ^9.0.0
  
  # UI/UX
  intl: ^0.19.0  # Persian date formatting
  shamsi_date: ^1.0.1  # Jalali calendar
  
  # Utilities
  uuid: ^4.4.0
  equatable: ^2.0.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  drift_dev: ^2.16.0
  build_runner: ^2.4.9
  mockito: ^5.4.4
```

---

## **1. Configuration & Theme**

### **config/constants.dart**
```dart
// Architecture: Dual-service setup
// - Next.js app serves: auth, menu items, categories (admin Web UI + API)
// - Go ordering service serves: order CRUD, WebSocket
// In production, a reverse proxy (nginx) routes /api/orders/* and /ws to Go service.
// In development, the Go service runs on a separate port (default 8080).
class AppConstants {
  // Next.js API (auth, menu management)
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://yourdomain.com',
  );
  // Go ordering service (orders, WebSocket)
  static const String orderServiceUrl = String.fromEnvironment(
    'ORDER_SERVICE_URL',
    defaultValue: 'https://yourdomain.com',
  );
  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'wss://yourdomain.com/ws',
  );
  
  // Auth
  static const String sessionCookieName = 'mofe_session';
  
  // Venue context (set after login / venue selection)
  static String currentVenueId = '';
  
  // Offline Queue
  static const int maxOfflineOrders = 50;
  static const Duration syncRetryDelay = Duration(seconds: 5);
  
  // WebSocket
  static const Duration wsReconnectDelay = Duration(seconds: 3);
  static const Duration wsPingInterval = Duration(seconds: 30);
}
```

### **config/theme.dart**
```dart
import 'package:flutter/material.dart';

// Design tokens matching web app CSS vars in globals.css:
// --paper: #f5f0e6;  --ink: #111111;
// --ink-strong: #000000;  --ink-muted: #5f5a52;
// --line: #d8d1c4;  --surface: rgba(255,255,255,0.28);
// --radius-panel: 28px;  --radius-card: 24px;  --radius-control: 16px;
class AppTheme {
  static const Color paperBackground = Color(0xFFF5F0E6);
  static const Color inkText = Color(0xFF111111);
  static const Color inkStrong = Color(0xFF000000);
  static const Color inkMuted = Color(0xFF5F5A52);
  static const Color borderLine = Color(0xFFD8D1C4);
  static const Color surfaceWhite = Color(0xFFFFFFFF);
  static const Color accentAmber = Color(0xFFD4A574);
  static const Color amberTint = Color(0xFFF5E6D0);
  
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.light(
      primary: accentAmber,
      background: paperBackground,
      surface: surfaceWhite,
      onPrimary: Colors.white,
      onBackground: inkText,
      onSurface: inkText,
    ),
    
    // Persian/RTL Typography
    fontFamily: 'Vazirmatn',
    textTheme: const TextTheme(
      displayLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: inkStrong),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: inkStrong),
      bodyLarge: TextStyle(fontSize: 16, color: inkText),
      bodyMedium: TextStyle(fontSize: 14, color: inkText),
    ),
    
    // Card Style
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: borderLine, width: 1),
      ),
    ),
    
    // App Bar
    appBarTheme: const AppBarTheme(
      backgroundColor: paperBackground,
      foregroundColor: inkText,
      elevation: 0,
      centerTitle: true,
    ),
  );
}
```

---

## **2. Data Models**

### **models/order.dart**
```dart
import 'package:equatable/equatable.dart';
import 'order_item.dart';

// Order statuses matching the Go ordering service:
// DRAFT → PENDING → SENT → IN_PROGRESS → READY → DELIVERED → CANCELLED
enum OrderStatus {
  draft('DRAFT', 'پیش‌نویس'),
  pending('PENDING', 'در انتظار'),
  sent('SENT', 'ارسال شده'),
  inProgress('IN_PROGRESS', 'در حال آماده‌سازی'),
  ready('READY', 'آماده'),
  delivered('DELIVERED', 'تحویل داده شده'),
  cancelled('CANCELLED', 'لغو شده');

  const OrderStatus(this.value, this.label);
  final String value;
  final String label;

  static OrderStatus fromString(String value) {
    return OrderStatus.values.firstWhere(
      (e) => e.value == value.toUpperCase(),
    );
  }
}

// Lightweight order summary returned by GET /api/orders (list endpoint)
// The Go list endpoint does NOT include items, venueId, waiterId, etc.
class OrderSummary extends Equatable {
  final String id;
  final String? tableNumber;
  final OrderStatus status;
  final int total;
  final DateTime createdAt;
  final String createdBy;

  const OrderSummary({
    required this.id,
    this.tableNumber,
    required this.status,
    required this.total,
    required this.createdAt,
    required this.createdBy,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: json['id'],
      tableNumber: json['tableNumber'] as String?,
      status: OrderStatus.fromString(json['status']),
      total: json['total'] as int,
      createdAt: DateTime.parse(json['createdAt']),
      createdBy: json['createdBy'] as String? ?? '',
    );
  }

  @override
  List<Object?> get props => [id, status, total];
}

// Full order detail returned by GET /api/orders/{id}
class Order extends Equatable {
  final String id;
  final String venueId;
  final String waiterId;
  final String? tableNumber;
  final int guestCount;
  final OrderStatus status;
  final int subtotal;
  final int total;
  final String? notes;
  final List<OrderItem> items;
  final DateTime createdAt;
  final DateTime? sentToKitchenAt;
  final DateTime? readyAt;
  final DateTime? deliveredAt;
  final DateTime? cancelledAt;
  final String createdBy;

  // Offline tracking (local only)
  final bool isSynced;
  final String? localId;

  const Order({
    required this.id,
    required this.venueId,
    required this.waiterId,
    this.tableNumber,
    this.guestCount = 1,
    required this.status,
    this.subtotal = 0,
    this.total = 0,
    this.notes,
    this.items = const [],
    required this.createdAt,
    this.sentToKitchenAt,
    this.readyAt,
    this.deliveredAt,
    this.cancelledAt,
    this.createdBy = '',
    this.isSynced = true,
    this.localId,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final items = json['items'] != null
        ? (json['items'] as List).map((i) => OrderItem.fromJson(i)).toList()
        : <OrderItem>[];
    return Order(
      id: json['id'],
      venueId: json['venueId'] as String? ?? '',
      waiterId: json['waiterId'] as String? ?? '',
      tableNumber: json['tableNumber'] as String?,
      guestCount: json['guestCount'] as int? ?? 1,
      status: OrderStatus.fromString(json['status']),
      subtotal: json['subtotal'] as int? ?? 0,
      total: json['total'] as int? ?? 0,
      notes: json['notes'] as String?,
      items: items,
      createdAt: DateTime.parse(json['createdAt']),
      sentToKitchenAt: json['sentToKitchenAt'] != null
          ? DateTime.parse(json['sentToKitchenAt'])
          : null,
      readyAt: json['readyAt'] != null
          ? DateTime.parse(json['readyAt'])
          : null,
      deliveredAt: json['deliveredAt'] != null
          ? DateTime.parse(json['deliveredAt'])
          : null,
      cancelledAt: json['cancelledAt'] != null
          ? DateTime.parse(json['cancelledAt'])
          : null,
      createdBy: json['createdBy'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'venueId': venueId,
    'waiterId': waiterId,
    if (tableNumber != null) 'tableNumber': tableNumber,
    'guestCount': guestCount,
    'status': status.value,
    'subtotal': subtotal,
    'total': total,
    if (notes != null) 'notes': notes,
    'items': items.map((i) => i.toJson()).toList(),
    'createdAt': createdAt.toIso8601String(),
    'createdBy': createdBy,
  };

  Order copyWith({
    OrderStatus? status,
    List<OrderItem>? items,
    int? subtotal,
    int? total,
    bool? isSynced,
  }) {
    return Order(
      id: id,
      venueId: venueId,
      waiterId: waiterId,
      tableNumber: tableNumber,
      guestCount: guestCount,
      status: status ?? this.status,
      subtotal: subtotal ?? this.subtotal,
      total: total ?? this.total,
      notes: notes,
      items: items ?? this.items,
      createdAt: createdAt,
      sentToKitchenAt: sentToKitchenAt,
      readyAt: readyAt,
      deliveredAt: deliveredAt,
      cancelledAt: cancelledAt,
      createdBy: createdBy,
      isSynced: isSynced ?? this.isSynced,
      localId: localId,
    );
  }

  @override
  List<Object?> get props => [id, status, items];
}
```

### **models/order_item.dart**
```dart
// Item statuses matching the Go ordering service:
// PENDING → SENT → PREPARING → READY → DELIVERED → CANCELLED
enum ItemStatus {
  pending('PENDING', 'در انتظار'),
  sent('SENT', 'ارسال شده'),
  preparing('PREPARING', 'در حال آماده‌سازی'),
  ready('READY', 'آماده'),
  delivered('DELIVERED', 'تحویل شده'),
  cancelled('CANCELLED', 'لغو شده');

  const ItemStatus(this.value, this.label);
  final String value;
  final String label;

  static ItemStatus fromString(String value) {
    return ItemStatus.values.firstWhere(
      (e) => e.value == value.toUpperCase(),
    );
  }
}

// Go ordering service supports only "KITCHEN" and "BAR"
enum Station {
  kitchen('KITCHEN', 'آشپزخانه'),
  bar('BAR', 'بار');

  const Station(this.value, this.label);
  final String value;
  final String label;

  static Station fromString(String value) {
    // Handle both lowercase (Next.js API: "kitchen"/"bar")
    // and uppercase (Go service: "KITCHEN"/"BAR")
    return Station.values.firstWhere(
      (e) => e.value == value.toUpperCase(),
    );
  }
}

class OrderItem extends Equatable {
  final String id;
  final String orderId;
  final String menuItemId;
  final String menuItemName;
  final String? variantId;
  final String? variantName;
  final int quantity;
  final int unitPrice;    // Integer Toman
  final int totalPrice;   // Integer Toman
  final ItemStatus status;
  final Station station;
  final String? notes;
  final int courseNumber;
  final DateTime createdAt;
  final DateTime? sentAt;
  final DateTime? preparingAt;
  final DateTime? readyAt;
  final DateTime? deliveredAt;
  final DateTime? cancelledAt;

  const OrderItem({
    required this.id,
    required this.orderId,
    required this.menuItemId,
    required this.menuItemName,
    this.variantId,
    this.variantName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.status,
    required this.station,
    this.notes,
    this.courseNumber = 1,
    required this.createdAt,
    this.sentAt,
    this.preparingAt,
    this.readyAt,
    this.deliveredAt,
    this.cancelledAt,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'],
      orderId: json['orderId'],
      menuItemId: json['menuItemId'],
      menuItemName: json['menuItemName'] as String? ?? json['name'] ?? '',
      variantId: json['variantId'] as String?,
      variantName: json['variantName'] as String?,
      quantity: json['quantity'] as int,
      unitPrice: json['unitPrice'] as int,
      totalPrice: json['totalPrice'] as int,
      status: ItemStatus.fromString(json['status']),
      station: Station.fromString(json['station']),
      notes: json['notes'] as String?,
      courseNumber: json['courseNumber'] as int? ?? 1,
      createdAt: DateTime.parse(json['createdAt']),
      sentAt: json['sentAt'] != null ? DateTime.parse(json['sentAt']) : null,
      preparingAt: json['preparingAt'] != null ? DateTime.parse(json['preparingAt']) : null,
      readyAt: json['readyAt'] != null ? DateTime.parse(json['readyAt']) : null,
      deliveredAt: json['deliveredAt'] != null ? DateTime.parse(json['deliveredAt']) : null,
      cancelledAt: json['cancelledAt'] != null ? DateTime.parse(json['cancelledAt']) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'orderId': orderId,
    'menuItemId': menuItemId,
    'menuItemName': menuItemName,
    if (variantId != null) 'variantId': variantId,
    if (variantName != null) 'variantName': variantName,
    'quantity': quantity,
    'unitPrice': unitPrice,
    'totalPrice': totalPrice,
    'status': status.value,
    'station': station.value,
    if (notes != null) 'notes': notes,
    'courseNumber': courseNumber,
    'createdAt': createdAt.toIso8601String(),
    'sentAt': sentAt?.toIso8601String(),
    'preparingAt': preparingAt?.toIso8601String(),
    'readyAt': readyAt?.toIso8601String(),
    'deliveredAt': deliveredAt?.toIso8601String(),
    'cancelledAt': cancelledAt?.toIso8601String(),
  };

  OrderItem copyWith({
    int? quantity,
    ItemStatus? status,
    String? notes,
  }) {
    return OrderItem(
      id: id,
      orderId: orderId,
      menuItemId: menuItemId,
      menuItemName: menuItemName,
      variantId: variantId,
      variantName: variantName,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice,
      totalPrice: unitPrice * (quantity ?? this.quantity),
      status: status ?? this.status,
      station: station,
      notes: notes ?? this.notes,
      courseNumber: courseNumber,
      createdAt: createdAt,
      sentAt: sentAt,
      preparingAt: preparingAt,
      readyAt: readyAt,
      deliveredAt: deliveredAt,
      cancelledAt: cancelledAt,
    );
  }

  @override
  List<Object?> get props => [id, quantity, status, notes];
}
```

### **models/menu_item.dart**
```dart
import 'package:equatable/equatable.dart';
import 'order_item.dart'; // for Station enum

// Lightweight variant model (fetched separately from /api/venues/{venueId}/items/{itemId}/variants)
class ItemVariant extends Equatable {
  final String id;
  final String nameFa;
  final String? nameEn;
  final int priceModifier; // Integer Toman, added to base price

  const ItemVariant({
    required this.id,
    required this.nameFa,
    this.nameEn,
    required this.priceModifier,
  });

  factory ItemVariant.fromJson(Map<String, dynamic> json) {
    return ItemVariant(
      id: json['id'],
      nameFa: json['nameFa'],
      nameEn: json['nameEn'] as String?,
      priceModifier: json['priceModifier'] as int,
    );
  }

  @override
  List<Object?> get props => [id, nameFa, priceModifier];
}

// MenuItem matches Prisma schema fields returned by GET /api/venues/{venueId}/items
// NOTE: variants and allergens are NOT included in the list endpoint;
// they must be fetched separately via their dedicated endpoints.
class MenuItem extends Equatable {
  final String id;
  final String venueId;
  final String categoryId;
  final String nameFa;
  final String? nameEn;
  final String? description;
  final int priceToman;        // Integer Toman (NOT double)
  final Station station;       // "kitchen" or "bar"
  final int? calories;
  final String? photoAssetId;
  final bool visibleOnPublicMenu;
  final bool isSoldOut;        // Inverted logic vs Flutter plan's isAvailable
  final int displayOrder;

  const MenuItem({
    required this.id,
    required this.venueId,
    required this.categoryId,
    required this.nameFa,
    this.nameEn,
    this.description,
    required this.priceToman,
    required this.station,
    this.calories,
    this.photoAssetId,
    this.visibleOnPublicMenu = true,
    this.isSoldOut = false,
    this.displayOrder = 0,
  });

  bool get isAvailable => !isSoldOut;

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['id'],
      venueId: json['venueId'],
      categoryId: json['categoryId'],
      nameFa: json['nameFa'],
      nameEn: json['nameEn'] as String?,
      description: json['description'] as String?,
      priceToman: json['priceToman'] as int,
      station: Station.fromString(json['station']),
      calories: json['calories'] as int?,
      photoAssetId: json['photoAssetId'] as String?,
      visibleOnPublicMenu: json['visibleOnPublicMenu'] as bool? ?? true,
      isSoldOut: json['isSoldOut'] as bool? ?? false,
      displayOrder: json['displayOrder'] as int? ?? 0,
    );
  }

  @override
  List<Object?> get props => [id, nameFa, priceToman, station];
}
```

---

## **3. Local Database (Drift)**

### **services/storage_service.dart**
```dart
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'dart:io';

part 'storage_service.g.dart';  // Generated by build_runner

// Table Definitions
class OfflineOrders extends Table {
  TextColumn get localId => text()();
  TextColumn get orderJson => text()();
  DateTimeColumn get createdAt => dateTime()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  
  @override
  Set<Column> get primaryKey => {localId};
}

@DriftDatabase(tables: [OfflineOrders])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  
  @override
  int get schemaVersion => 1;
  
  // CRUD Operations
  Future<void> insertOfflineOrder(String localId, String orderJson) {
    return into(offlineOrders).insert(
      OfflineOrdersCompanion.insert(
        localId: localId,
        orderJson: orderJson,
        createdAt: DateTime.now(),
      ),
    );
  }
  
  Future<List<OfflineOrder>> getUnsyncedOrders() {
    return (select(offlineOrders)
      ..where((o) => o.isSynced.equals(false))
      ..orderBy([(o) => OrderingTerm.asc(o.createdAt)]))
        .get();
  }
  
  Future<void> markAsSynced(String localId) {
    return (update(offlineOrders)
      ..where((o) => o.localId.equals(localId)))
        .write(const OfflineOrdersCompanion(isSynced: Value(true)));
  }
  
  Future<void> deleteOrder(String localId) {
    return (delete(offlineOrders)
      ..where((o) => o.localId.equals(localId)))
        .go();
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'mofe_waiter.db'));
    return NativeDatabase(file);
  });
}
```

---

## **4. Services Layer**

### **services/auth_service.dart**
```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/constants.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  String? _cachedToken;

  AuthService(this._dio, this._storage);

  // Login uses email (NOT phone). The backend sets mofe_session cookie.
  // Login response is { "success": true } + Set-Cookie header.
  // User profile data must be fetched via GET /api/me.
  Future<void> login(String email, String password) async {
    final response = await _dio.post(
      '${AppConstants.baseUrl}/api/auth/login',
      data: { 'email': email, 'password': password },
      options: Options(validateStatus: (s) => s! < 500),
    );
    // Extract the raw session token from Set-Cookie header.
    // We need the raw token value for the WebSocket Cookie header
    // (Dio's CookieJar handles HTTP automatically, but WebSocket
    // needs it set manually).
    await cacheTokenFromCookie(response.headers);
  }

  // Fetch current user profile + venue memberships from GET /api/me
  Future<Map<String, dynamic>> fetchMe() async {
    final response = await _dio.get('${AppConstants.baseUrl}/api/me');
    return response.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try {
      await _dio.post('${AppConstants.baseUrl}/api/auth/logout');
    } catch (_) {}
    await _storage.delete(key: 'session_token');
    _cachedToken = null;
  }

  Future<String?> getSessionToken() async {
    _cachedToken ??= await _storage.read(key: 'session_token');
    return _cachedToken;
  }

  // Called by Dio interceptor after login to cache the token
  Future<void> cacheTokenFromCookie(Headers headers) async {
    final cookies = headers['set-cookie'];
    if (cookies == null) return;
    final sessionCookie = cookies.where(
      (c) => c.startsWith('${AppConstants.sessionCookieName}='),
    ).firstOrNull;
    if (sessionCookie == null) return;
    // Format: "mofe_session=<hex_token>; Path=/; HttpOnly; ..."
    final token = sessionCookie
        .split(';')[0]
        .split('=')
        .sublist(1)
        .join('=');
    await _storage.write(key: 'session_token', value: token);
    _cachedToken = token;
  }
}

class VenueMembership {
  final String venueId;
  final String role;
  final String venueName;

  const VenueMembership({
    required this.venueId,
    required this.role,
    required this.venueName,
  });

  factory VenueMembership.fromJson(Map<String, dynamic> json) {
    return VenueMembership(
      venueId: json['venueId'],
      role: json['role'],
      venueName: json['venueName'] ?? json['venue']?['nameFa'] ?? '',
    );
  }
}

class SessionData {
  final String userId;
  final String userName;
  final String email;
  final List<VenueMembership> memberships;

  // Convenience: the currently selected venue
  String get currentVenueId => AppConstants.currentVenueId;
  VenueMembership? get currentMembership => memberships.isEmpty
      ? null
      : memberships.firstWhere(
          (m) => m.venueId == currentVenueId,
          orElse: () => memberships.first,
        );

  SessionData({
    required this.userId,
    required this.userName,
    required this.email,
    required this.memberships,
  });

  factory SessionData.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>;
    final memberships = (json['memberships'] as List?)
            ?.map((m) => VenueMembership.fromJson(m as Map<String, dynamic>))
            .toList() ??
        [];
    // If user belongs to exactly one venue, auto-select it
    if (memberships.length == 1 && AppConstants.currentVenueId.isEmpty) {
      AppConstants.currentVenueId = memberships.first.venueId;
    }
    return SessionData(
      userId: user['id'],
      userName: user['name'] ?? '',
      email: user['email'] ?? '',
      memberships: memberships,
    );
  }
}
```

### **services/api_service.dart**
```dart
import 'package:dio/dio.dart';
import '../config/constants.dart';
import '../models/order.dart';
import '../models/menu_item.dart';

class ApiService {
  final Dio _dio;        // For Next.js API (auth, menu, etc.)
  final Dio _orderDio;   // For Go ordering service

  ApiService(this._dio, this._orderDio);

  // ── Orders (Go ordering service) ──────────────────────────

  // Step 1: Create empty order, returns orderId
  Future<String> createOrder({
    String? tableNumber,
    int guestCount = 1,
    String? notes,
  }) async {
    final response = await _orderDio.post(
      '${AppConstants.orderServiceUrl}/api/orders',
      data: {
        if (tableNumber != null && tableNumber.isNotEmpty)
          'tableNumber': tableNumber,
        'guestCount': guestCount,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
    return response.data['orderId'] as String;
  }

  // Step 2: Add item to existing order
  Future<String> addItemToOrder(
    String orderId, {
    required String menuItemId,
    String? variantId,
    required int quantity,
    String? notes,
  }) async {
    final response = await _orderDio.post(
      '${AppConstants.orderServiceUrl}/api/orders/$orderId/items',
      data: {
        'menuItemId': menuItemId,
        if (variantId != null) 'variantId': variantId,
        'quantity': quantity,
        if (notes != null) 'notes': notes,
      },
    );
    return response.data['itemId'] as String;
  }

  // Convenience: create order + add all items in one logical call
  Future<Order> createOrderWithItems({
    String? tableNumber,
    int guestCount = 1,
    String? notes,
    required List<Map<String, dynamic>> items,
  }) async {
    final orderId = await createOrder(
      tableNumber: tableNumber,
      guestCount: guestCount,
      notes: notes,
    );
    for (final item in items) {
      await addItemToOrder(
        orderId,
        menuItemId: item['menuItemId'],
        variantId: item['variantId'],
        quantity: item['quantity'],
        notes: item['notes'],
      );
    }
    return getOrder(orderId);
  }

  // List orders: returns lightweight OrderSummary objects
  Future<List<OrderSummary>> getOrders({OrderStatus? status}) async {
    final response = await _orderDio.get(
      '${AppConstants.orderServiceUrl}/api/orders',
      queryParameters: {
        if (status != null) 'status': status.value,
      },
    );
    return (response.data as List)
        .map((o) => OrderSummary.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  // Get full order detail (with items)
  Future<Order> getOrder(String orderId) async {
    final response = await _orderDio.get(
      '${AppConstants.orderServiceUrl}/api/orders/$orderId',
    );
    return Order.fromJson(response.data as Map<String, dynamic>);
  }

  // Send order to kitchen/bar
  Future<void> sendToKitchen(String orderId) async {
    await _orderDio.post(
      '${AppConstants.orderServiceUrl}/api/orders/$orderId/send',
    );
  }

  // Update order item (qty, notes)
  Future<void> updateOrderItem(
    String orderId,
    String itemId, {
    int? quantity,
    String? notes,
  }) async {
    await _orderDio.patch(
      '${AppConstants.orderServiceUrl}/api/orders/$orderId/items/$itemId',
      data: {
        if (quantity != null) 'quantity': quantity,
        if (notes != null) 'notes': notes,
      },
    );
  }

  // Cancel order item
  Future<void> cancelOrderItem(String orderId, String itemId) async {
    await _orderDio.delete(
      '${AppConstants.orderServiceUrl}/api/orders/$orderId/items/$itemId',
    );
  }

  // ── Menu (Next.js API) ───────────────────────────────────

  // Menu items are scoped to a venue: GET /api/venues/{venueId}/items
  // Does NOT include variants or allergens (separate endpoints).
  Future<List<MenuItem>> getMenu() async {
    final venueId = AppConstants.currentVenueId;
    final response = await _dio.get(
      '${AppConstants.baseUrl}/api/venues/$venueId/items',
    );
    return (response.data as List)
        .map((m) => MenuItem.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  // Fetch variants for a specific menu item
  Future<List<ItemVariant>> getItemVariants(String menuItemId) async {
    final venueId = AppConstants.currentVenueId;
    final response = await _dio.get(
      '${AppConstants.baseUrl}/api/venues/$venueId/items/$menuItemId/variants',
    );
    return (response.data as List)
        .map((v) => ItemVariant.fromJson(v as Map<String, dynamic>))
        .toList();
  }
}
```

### **services/websocket_service.dart**
```dart
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import '../config/constants.dart';
import '../models/websocket_event.dart';

// WebSocket auth is COOKIE-BASED (not query param).
// The Go ordering service reads the mofe_session cookie during the
// WebSocket upgrade handshake. Flutter's WebSocket does NOT send
// cookies automatically — we must set the Cookie header manually.
class WebSocketService {
  WebSocketChannel? _channel;
  final String _sessionToken;
  final _eventController = StreamController<WebSocketEvent>.broadcast();
  Timer? _reconnectTimer;
  Timer? _pingTimer;
  bool _isConnected = false;

  WebSocketService(this._sessionToken);

  Stream<WebSocketEvent> get events => _eventController.stream;
  bool get isConnected => _isConnected;

  void connect() {
    try {
      final uri = Uri.parse(AppConstants.wsUrl);
      // The Go auth middleware requires the mofe_session cookie.
      // We send it manually since Flutter's WebSocket does not
      // include cookies from the HTTP cookie store.
      final headers = <String, dynamic>{
        HttpHeaders.cookieHeader:
            '${AppConstants.sessionCookieName}=$_sessionToken',
      };
      _channel = WebSocketChannel.connect(
        uri,
        headers: headers,
      );

      _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDisconnect,
      );

      _isConnected = true;
      _startPingTimer();
    } catch (e) {
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String);
      final event = WebSocketEvent.fromJson(data);
      _eventController.add(event);
    } catch (e) {
      // Invalid message format
    }
  }

  void _handleError(error) {
    _isConnected = false;
    _scheduleReconnect();
  }

  void _handleDisconnect() {
    _isConnected = false;
    _pingTimer?.cancel();
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(AppConstants.wsReconnectDelay, connect);
  }

  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(AppConstants.wsPingInterval, (_) {
      if (_isConnected) {
        _channel?.sink.add(jsonEncode({'type': 'ping'}));
      }
    });
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _pingTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _eventController.close();
  }
}
```

## **5. Offline Queue Service**

### **services/offline_queue_service.dart**
```dart
import 'dart:async';
import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/order.dart';
import 'storage_service.dart';
import 'api_service.dart';

/// Stores full order data for offline queuing:
/// { localId, venueId, tableNumber, guestCount, notes, items: [...],
///   createdAt, isSynced }
class OfflineQueueService {
  final AppDatabase _db;
  final ApiService _api;
  final Connectivity _connectivity;
  final _uuid = const Uuid();

  StreamSubscription? _connectivitySub;
  Timer? _syncTimer;
  bool _isSyncing = false;

  OfflineQueueService(this._db, this._api, this._connectivity);

  void startListening() {
    _connectivitySub = _connectivity.onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none && !_isSyncing) {
        _syncPendingOrders();
      }
    });
  }

  Future<String> queueOrder({
    String? tableNumber,
    int guestCount = 1,
    String? notes,
    required List<Map<String, dynamic>> items,
  }) async {
    final localId = _uuid.v4();
    final payload = jsonEncode({
      'localId': localId,
      'tableNumber': tableNumber,
      'guestCount': guestCount,
      'notes': notes,
      'items': items,
      'createdAt': DateTime.now().toIso8601String(),
    });

    await _db.insertOfflineOrder(localId, payload);

    // Attempt immediate sync if online
    final connectivity = await _connectivity.checkConnectivity();
    if (connectivity != ConnectivityResult.none) {
      unawaited(_syncPendingOrders());
    }

    return localId;
  }

  Future<void> _syncPendingOrders() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final unsyncedOrders = await _db.getUnsyncedOrders();

      for (final offlineOrder in unsyncedOrders) {
        try {
          final data = jsonDecode(offlineOrder.orderJson) as Map<String, dynamic>;

          // Step 1: Create empty order
          final orderId = await _api.createOrder(
            tableNumber: data['tableNumber'] as String?,
            guestCount: data['guestCount'] as int? ?? 1,
            notes: data['notes'] as String?,
          );

          // Step 2: Add each item
          final items = data['items'] as List;
          for (final item in items) {
            await _api.addItemToOrder(
              orderId,
              menuItemId: item['menuItemId'],
              variantId: item['variantId'],
              quantity: item['quantity'],
              notes: item['notes'],
            );
          }

          await _db.markAsSynced(offlineOrder.localId);

          // Delete synced orders after 24 hours
          if (offlineOrder.createdAt
              .difference(DateTime.now())
              .inHours
              .abs() > 24) {
            await _db.deleteOrder(offlineOrder.localId);
          }
        } catch (e) {
          // Failed to sync this order, continue to next
          continue;
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<int> getPendingOrdersCount() async {
    final orders = await _db.getUnsyncedOrders();
    return orders.length;
  }

  void dispose() {
    _connectivitySub?.cancel();
    _syncTimer?.cancel();
  }
}
```

---

## **6. Providers (Riverpod State Management)**

### **providers/auth_provider.dart**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';
import '../config/constants.dart';

// ── Dio instances ───────────────────────────────────────
// Two separate services each with their own Dio:
// Next.js API (auth, menu)  &  Go ordering service (orders)

final storageProvider = Provider<FlutterSecureStorage>(
  (_) => const FlutterSecureStorage(),
);

// Dio for Next.js API (baseUrl /api/*)
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));
  _addAuthInterceptor(dio, ref);
  return dio;
});

// Dio for Go ordering service (orderServiceUrl /api/orders/*)
final orderDioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: AppConstants.orderServiceUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));
  _addAuthInterceptor(dio, ref);
  return dio;
});

void _addAuthInterceptor(Dio dio, Ref ref) {
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'session_token');
      if (token != null) {
        options.headers['Cookie'] =
            '${AppConstants.sessionCookieName}=$token';
      }
      // Multi-venue: add X-Venue-ID header if user has >1 venue
      final session = ref.read(authProvider).session;
      if (session != null && session.memberships.length > 1) {
        options.headers['X-Venue-ID'] = AppConstants.currentVenueId;
      }
      return handler.next(options);
    },
    onError: (error, handler) {
      if (error.response?.statusCode == 401) {
        ref.read(authProvider.notifier).logout();
      }
      return handler.next(error);
    },
  ));
}

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(
    ref.watch(dioProvider),
    ref.watch(storageProvider),
  );
});

// ── Auth state ──────────────────────────────────────────
class AuthState {
  final SessionData? session;
  final bool isLoading;
  final String? error;
  final bool isInitialized; // true after session check

  const AuthState({
    this.session,
    this.isLoading = false,
    this.error,
    this.isInitialized = false,
  });

  bool get isAuthenticated => session != null;

  AuthState copyWith({
    SessionData? session,
    bool? isLoading,
    String? error,
    bool? isInitialized,
  }) {
    return AuthState(
      session: session ?? this.session,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isInitialized: isInitialized ?? this.isInitialized,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final Ref _ref;

  AuthNotifier(this._authService, this._ref) : super(const AuthState()) {
    _checkExistingSession();
  }

  // On app start, check if we have a stored session cookie
  // and validate it by calling GET /api/me
  Future<void> _checkExistingSession() async {
    final token = await _authService.getSessionToken();
    if (token == null) {
      state = state.copyWith(isInitialized: true);
      return;
    }
    try {
      final meData = await _authService.fetchMe();
      final session = SessionData.fromJson(meData);
      state = state.copyWith(session: session, isInitialized: true);
    } catch (_) {
      // Session invalid or expired
      await _authService.logout();
      state = state.copyWith(isInitialized: true);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // Step 1: POST /api/auth/login (sets cookie)
      await _authService.login(email, password);

      // Step 2: GET /api/me to get user + venue memberships
      final meData = await _authService.fetchMe();
      final session = SessionData.fromJson(meData);

      state = state.copyWith(session: session, isLoading: false);
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] as String? ??
          'خطا در اتصال به سرور';
      state = state.copyWith(isLoading: false, error: msg);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'خطا در اتصال به سرور',
      );
    }
  }

  // Call after user picks a venue (multi-venue users)
  void selectVenue(String venueId) {
    AppConstants.currentVenueId = venueId;
  }

  Future<void> logout() async {
    await _authService.logout();
    AppConstants.currentVenueId = '';
    state = const AuthState(isInitialized: true);
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authServiceProvider),
    ref,
  );
});
```

### **providers/connectivity_provider.dart**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

final connectivityProvider = StreamProvider<ConnectivityResult>((ref) {
  return Connectivity().onConnectivityChanged;
});

final isOnlineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityProvider);
  return connectivity.when(
    data: (result) => result != ConnectivityResult.none,
    loading: () => true,
    error: (_, __) => false,
  );
});
```

### **providers/orders_provider.dart**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import '../services/offline_queue_service.dart';
import '../services/storage_service.dart';
import '../services/websocket_service.dart';
import 'auth_provider.dart';
import 'connectivity_provider.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(ref.watch(dioProvider), ref.watch(orderDioProvider));
});

final databaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

final offlineQueueProvider = Provider<OfflineQueueService>((ref) {
  final service = OfflineQueueService(
    ref.watch(databaseProvider),
    ref.watch(apiServiceProvider),
    Connectivity(),
  );
  service.startListening();
  return service;
});

// WebSocket connection is managed imperatively in the app lifecycle,
// not as a Riverpod provider. The websocket_service_provider below
// is available for injection but should only be accessed after auth.
// Use the orders_provider or app-level init to start the WS connection.
final websocketServiceProvider = StateProvider<WebSocketService?>((ref) => null);

// Start WebSocket connection after login succeeds
Future<void> initializeWebSocket(Ref ref) async {
  final authState = ref.watch(authProvider);
  if (!authState.isAuthenticated) return;

  final token = await ref.read(authServiceProvider).getSessionToken();
  if (token == null) return;

  final ws = WebSocketService(token);
  ws.connect();

  ws.events.listen((event) {
    ref.read(ordersProvider.notifier).handleWebSocketEvent(event);
  });

  ref.read(websocketServiceProvider.notifier).state = ws;
}

// Call this on app logout
void disposeWebSocket(Ref ref) {
  final ws = ref.read(websocketServiceProvider);
  ws?.dispose();
  ref.read(websocketServiceProvider.notifier).state = null;
}

// ── Orders state ────────────────────────────────────────
// Stores OrderSummary for the list view. Full Order objects
// are fetched on demand when viewing order details.
class OrdersState {
  final List<OrderSummary> summaries;
  final Map<String, Order> orderDetails; // cache: orderId → full Order
  final bool isLoading;
  final String? error;
  final int pendingOfflineOrders;

  const OrdersState({
    this.summaries = const [],
    this.orderDetails = const {},
    this.isLoading = false,
    this.error,
    this.pendingOfflineOrders = 0,
  });

  OrdersState copyWith({
    List<OrderSummary>? summaries,
    Map<String, Order>? orderDetails,
    bool? isLoading,
    String? error,
    int? pendingOfflineOrders,
  }) {
    return OrdersState(
      summaries: summaries ?? this.summaries,
      orderDetails: orderDetails ?? this.orderDetails,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      pendingOfflineOrders: pendingOfflineOrders ?? this.pendingOfflineOrders,
    );
  }
}

class OrdersNotifier extends StateNotifier<OrdersState> {
  final ApiService _api;
  final OfflineQueueService _offlineQueue;
  final Ref _ref;

  OrdersNotifier(this._api, this._offlineQueue, this._ref)
      : super(const OrdersState()) {
    loadOrders();
    _updatePendingCount();
  }

  Future<void> loadOrders({OrderStatus? status}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final summaries = await _api.getOrders(status: status);
      state = state.copyWith(summaries: summaries, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'خطا در بارگذاری سفارشات',
      );
    }
  }

  // Fetch full order detail (with items)
  Future<Order> fetchOrderDetail(String orderId) async {
    final order = await _api.getOrder(orderId);
    state = state.copyWith(
      orderDetails: {...state.orderDetails, orderId: order},
    );
    return order;
  }

  // 2-step order creation: create empty order, then add items
  Future<void> createOrder({
    String? tableNumber,
    int guestCount = 1,
    String? notes,
    required List<Map<String, dynamic>> items,
  }) async {
    final isOnline = _ref.read(isOnlineProvider);

    if (!isOnline) {
      // Queue for offline sync
      await _offlineQueue.queueOrder(
        tableNumber: tableNumber,
        guestCount: guestCount,
        notes: notes,
        items: items,
      );
      await _updatePendingCount();
      return;
    }

    try {
      final order = await _api.createOrderWithItems(
        tableNumber: tableNumber,
        guestCount: guestCount,
        notes: notes,
        items: items,
      );
      // Refresh the list
      await loadOrders();
    } catch (e) {
      // If online but the request failed, queue for offline retry
      await _offlineQueue.queueOrder(
        tableNumber: tableNumber,
        guestCount: guestCount,
        notes: notes,
        items: items,
      );
      await _updatePendingCount();
    }
  }

  Future<void> sendToKitchen(String orderId) async {
    try {
      await _api.sendToKitchen(orderId);
      await loadOrders();
    } catch (e) {
      state = state.copyWith(error: 'خطا در ارسال سفارش');
    }
  }

  Future<void> updateOrderItem({
    required String orderId,
    required String itemId,
    int? quantity,
    String? notes,
  }) async {
    try {
      await _api.updateOrderItem(orderId, itemId,
          quantity: quantity, notes: notes);
      await loadOrders();
    } catch (e) {
      state = state.copyWith(error: 'خطا در به‌روزرسانی آیتم');
    }
  }

  Future<void> cancelOrderItem(String orderId, String itemId) async {
    try {
      await _api.cancelOrderItem(orderId, itemId);
      final updated = await _api.getOrder(orderId);
      state = state.copyWith(
        orderDetails: {...state.orderDetails, orderId: updated},
      );
      await loadOrders();
    } catch (e) {
      state = state.copyWith(error: 'خطا در لغو آیتم');
    }
  }

  void handleWebSocketEvent(WebSocketEvent event) {
    switch (event.type) {
      case 'order_created':
        // Refresh the list — the payload is a full order but we want
        // to keep the list consistent. For simplicity, just reload.
        loadOrders();
        break;

      case 'item_status_changed':
        _updateItemInCachedOrder(
          event.payload['orderId'] as String,
          event.payload['itemId'] as String,
          ItemStatus.fromString(event.payload['status'] as String),
        );
        break;

      case 'order_status_changed':
        _updateSummaryStatus(
          event.payload['orderId'] as String,
          OrderStatus.fromString(event.payload['status'] as String),
        );
        break;
    }
  }

  void _updateItemInCachedOrder(
      String orderId, String itemId, ItemStatus newStatus) {
    final cached = state.orderDetails[orderId];
    if (cached == null) return;

    final updatedItems = cached.items.map((item) {
      if (item.id != itemId) return item;
      return item.copyWith(status: newStatus);
    }).toList();

    state = state.copyWith(
      orderDetails: {
        ...state.orderDetails,
        orderId: cached.copyWith(items: updatedItems),
      },
    );
  }

  void _updateSummaryStatus(String orderId, OrderStatus newStatus) {
    final updated = state.summaries.map((s) {
      if (s.id != orderId) return s;
      return OrderSummary(
        id: s.id,
        tableNumber: s.tableNumber,
        status: newStatus,
        total: s.total,
        createdAt: s.createdAt,
        createdBy: s.createdBy,
      );
    }).toList();
    state = state.copyWith(summaries: updated);
  }

  Future<void> _updatePendingCount() async {
    final count = await _offlineQueue.getPendingOrdersCount();
    state = state.copyWith(pendingOfflineOrders: count);
  }
}

final ordersProvider =
    StateNotifierProvider<OrdersNotifier, OrdersState>((ref) {
  return OrdersNotifier(
    ref.watch(apiServiceProvider),
    ref.watch(offlineQueueProvider),
    ref,
  );
});
```

### **providers/menu_provider.dart**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/menu_item.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

// Menu items are venue-scoped: GET /api/venues/{venueId}/items
// Refetches when venue changes (via AppConstants.currentVenueId).
final venueIdProvider = Provider<String>((ref) {
  final session = ref.watch(authProvider).session;
  if (session == null) return '';
  return session.currentVenueId;
});

final menuProvider = FutureProvider<List<MenuItem>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final venueId = ref.watch(venueIdProvider);
  if (venueId.isEmpty) return [];
  return await api.getMenu();
});

final menuByStationProvider = Provider<Map<Station, List<MenuItem>>>((ref) {
  final menu = ref.watch(menuProvider);

  return menu.when(
    data: (items) {
      final grouped = <Station, List<MenuItem>>{};
      for (final item in items) {
        grouped.putIfAbsent(item.station, () => []).add(item);
      }
      return grouped;
    },
    loading: () => {},
    error: (_, __) => {},
  );
});
```

---

## **7. WebSocket Event Model**

### **models/websocket_event.dart**
```dart
class WebSocketEvent {
  final String type;
  final Map<String, dynamic> payload;
  final DateTime timestamp;
  
  WebSocketEvent({
    required this.type,
    required this.payload,
    required this.timestamp,
  });
  
  factory WebSocketEvent.fromJson(Map<String, dynamic> json) {
    return WebSocketEvent(
      type: json['type'],
      payload: json['payload'] ?? {},
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}
```

---

## **8. UI Screens**

### **screens/login_screen.dart**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../config/theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    if (_formKey.currentState!.validate()) {
      ref.read(authProvider.notifier).login(
        _emailController.text.trim(),
        _passwordController.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    // Navigate on successful login
    ref.listen(authProvider, (previous, next) {
      if (next.isAuthenticated) {
        Navigator.of(context).pushReplacementNamed('/orders');
      }
    });

    return Scaffold(
      backgroundColor: AppTheme.paperBackground,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo
                  Icon(
                    Icons.restaurant_menu,
                    size: 80,
                    color: AppTheme.accentAmber,
                  ),
                  const SizedBox(height: 16),
                  
                  Text(
                    'موفه',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'DMSerifDisplay',
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.inkStrong,
                    ),
                  ),
                  
                  const SizedBox(height: 8),
                  
                  Text(
                    'پنل پیشخدمت',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      color: AppTheme.inkMuted,
                    ),
                  ),
                  
                  const SizedBox(height: 48),
                  
                  // Email field (not phone — login uses email)
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textDirection: TextDirection.ltr,
                    decoration: InputDecoration(
                      labelText: 'ایمیل',
                      hintText: 'example@email.com',
                      prefixIcon: const Icon(Icons.email),
                      filled: true,
                      fillColor: AppTheme.surfaceWhite,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.borderLine),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.borderLine),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: AppTheme.accentAmber,
                          width: 2,
                        ),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'لطفاً ایمیل را وارد کنید';
                      }
                      if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                          .hasMatch(value)) {
                        return 'ایمیل معتبر نیست';
                      }
                      return null;
                    },
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Password field
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'رمز عبور',
                      prefixIcon: const Icon(Icons.lock),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off
                              : Icons.visibility,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                      filled: true,
                      fillColor: AppTheme.surfaceWhite,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.borderLine),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.borderLine),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: AppTheme.accentAmber,
                          width: 2,
                        ),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'لطفاً رمز عبور را وارد کنید';
                      }
                      return null;
                    },
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Login button
                  ElevatedButton(
                    onPressed: authState.isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentAmber,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 2,
                    ),
                    child: authState.isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          )
                        : const Text(
                            'ورود',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                  
                  // Error message
                  if (authState.error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Text(
                        authState.error!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.red.shade700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

### **screens/orders_list_screen.dart**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/orders_provider.dart';
import '../providers/connectivity_provider.dart';
import '../providers/auth_provider.dart';
import '../models/order.dart';
import '../widgets/order_card.dart';
import '../widgets/connectivity_banner.dart';
import '../config/theme.dart';

class OrdersListScreen extends ConsumerStatefulWidget {
  const OrdersListScreen({super.key});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  OrderStatus? _selectedStatus;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    // Order statuses matching Go service: DRAFT, PENDING, SENT,
    // IN_PROGRESS, READY, DELIVERED, CANCELLED
    final statusMap = [
      null, // All
      OrderStatus.pending,
      OrderStatus.inProgress,
      OrderStatus.ready,
    ];
    
    setState(() {
      _selectedStatus = statusMap[_tabController.index];
    });
    
    ref.read(ordersProvider.notifier).loadOrders(status: _selectedStatus);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(ordersProvider);
    final isOnline = ref.watch(isOnlineProvider);
    final authState = ref.watch(authProvider);

    // Filter orders by selected status
    final filteredOrders = _selectedStatus == null
        ? ordersState.orders
        : ordersState.orders
            .where((order) => order.status == _selectedStatus)
            .toList();

    return Scaffold(
      backgroundColor: AppTheme.paperBackground,
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceWhite,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'سفارشات',
              style: TextStyle(
                fontFamily: 'DMSerifDisplay',
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppTheme.inkStrong,
              ),
            ),
            Text(
              authState.session?.currentMembership?.venueName ?? '',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.inkMuted,
              ),
            ),
          ],
        ),
        actions: [
          // Pending offline badge
          if (ordersState.pendingOfflineOrders > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.amberTint,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.cloud_upload,
                        size: 16,
                        color: AppTheme.accentAmber,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${ordersState.pendingOfflineOrders}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.accentAmber,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              ref.read(authProvider.notifier).logout();
              Navigator.of(context).pushReplacementNamed('/login');
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.accentAmber,
          unselectedLabelColor: AppTheme.inkMuted,
          indicatorColor: AppTheme.accentAmber,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'همه'),
            Tab(text: 'در انتظار'),
            Tab(text: 'در حال آماده‌سازی'),
            Tab(text: 'آماده'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Connectivity banner
          ConnectivityBanner(isOnline: isOnline),
          
          // Orders list
          Expanded(
            child: ordersState.isLoading
                ? const Center(child: CircularProgressIndicator())
                : ordersState.error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 64,
                              color: AppTheme.inkMuted,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              ordersState.error!,
                              style: TextStyle(color: AppTheme.inkMuted),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => ref
                                  .read(ordersProvider.notifier)
                                  .loadOrders(status: _selectedStatus),
                              child: const Text('تلاش مجدد'),
                            ),
                          ],
                        ),
                      )
                    : filteredOrders.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.receipt_long,
                                  size: 64,
                                  color: AppTheme.inkMuted,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'سفارشی وجود ندارد',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: AppTheme.inkMuted,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => ref
                                .read(ordersProvider.notifier)
                                .loadOrders(status: _selectedStatus),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: filteredOrders.length,
                              itemBuilder: (context, index) {
                                return OrderCard(
                                  order: filteredOrders[index],
                                  onTap: () {
                                    Navigator.of(context).pushNamed(
                                      '/order-detail',
                                      arguments: filteredOrders[index],
                                    );
                                  },
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).pushNamed('/new-order');
        },
        backgroundColor: AppTheme.accentAmber,
        icon: const Icon(Icons.add),
        label: const Text('سفارش جدید'),
      ),
    );
  }
}
```

### **screens/new_order_screen.dart**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/orders_provider.dart';
import '../providers/menu_provider.dart';
import '../models/menu_item.dart';
import '../models/order.dart';
import '../widgets/menu_item_card.dart';
import '../config/theme.dart';

class NewOrderScreen extends ConsumerStatefulWidget {
  const NewOrderScreen({super.key});

  @override
  ConsumerState<NewOrderScreen> createState() => _NewOrderScreenState();
}

class _NewOrderScreenState extends ConsumerState<NewOrderScreen> {
  final _tableController = TextEditingController();
  final _notesController = TextEditingController();
  final Map<String, CartItem> _cartItems = {};
  Station? _selectedStation;

  @override
  void dispose() {
    _tableController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _addToCart(MenuItem menuItem, {String? variantId, String? variantName}) {
    final key = variantId ?? menuItem.id;
    
    setState(() {
      if (_cartItems.containsKey(key)) {
        _cartItems[key] = _cartItems[key]!.copyWith(
          quantity: _cartItems[key]!.quantity + 1,
        );
      } else {
        _cartItems[key] = CartItem(
          menuItemId: menuItem.id,
          name: menuItem.nameFa,
          variantId: variantId,
          variantName: variantName,
          unitPrice: menuItem.priceToman, // base price; variant modifier added at submit
          quantity: 1,
          station: menuItem.station,
        );
      }
    });
  }

  void _removeFromCart(String key) {
    setState(() {
      if (_cartItems[key]!.quantity > 1) {
        _cartItems[key] = _cartItems[key]!.copyWith(
          quantity: _cartItems[key]!.quantity - 1,
        );
      } else {
        _cartItems.remove(key);
      }
    });
  }

  Future<void> _submitOrder() async {
    if (_tableController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('لطفاً شماره میز را وارد کنید')),
      );
      return;
    }

    if (_cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('سبد خرید خالی است')),
      );
      return;
    }

    final items = _cartItems.values.map((item) => {
      'menuItemId': item.menuItemId,
      if (item.variantId != null) 'variantId': item.variantId,
      'quantity': item.quantity,
      'notes': null,
    }).toList();

    try {
      final tableText = _tableController.text.trim();
      await ref.read(ordersProvider.notifier).createOrder(
        tableNumber: tableText.isEmpty ? null : tableText,
        items: items,
        notes: _notesController.text.isEmpty ? null : _notesController.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('سفارش با موفقیت ثبت شد')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطا در ثبت سفارش: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final menuAsync = ref.watch(menuProvider);
    final menuByStation = ref.watch(menuByStationProvider);

    return Scaffold(
      backgroundColor: AppTheme.paperBackground,
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceWhite,
        elevation: 0,
        title: Text(
          'سفارش جدید',
          style: TextStyle(
            fontFamily: 'DMSerifDisplay',
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: AppTheme.inkStrong,
          ),
        ),
      ),
      body: Column(
        children: [
          // Table number input
          Container(
            color: AppTheme.surfaceWhite,
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _tableController,
                    keyboardType: TextInputType.text,
                    decoration: InputDecoration(
                      labelText: 'شماره میز',
                      prefixIcon: const Icon(Icons.table_restaurant),
                      filled: true,
                      fillColor: AppTheme.paperBackground,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Cart badge
                Stack(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.shopping_cart),
                      iconSize: 32,
                      onPressed: _cartItems.isEmpty
                          ? null
                          : () => _showCartSheet(context),
                    ),
                    if (_cartItems.isNotEmpty)
                      Positioned(
                        right: 0,
                        top: 0,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: AppTheme.accentAmber,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '${_cartItems.length}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),

          // Station filter
          Container(
            height: 50,
            color: AppTheme.surfaceWhite,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _StationChip(
                  label: 'همه',
                  isSelected: _selectedStation == null,
                  onTap: () => setState(() => _selectedStation = null),
                ),
                ...Station.values.map((station) => _StationChip(
                  label: station.label,
                  isSelected: _selectedStation == station,
                  onTap: () => setState(() => _selectedStation = station),
                )),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Menu items
          Expanded(
            child: menuAsync.when(
              data: (menu) {
                final filteredMenu = _selectedStation == null
                    ? menu
                    : menu.where((item) => item.station == _selectedStation).toList();

                if (filteredMenu.isEmpty) {
                  return const Center(child: Text('آیتمی یافت نشد'));
                }

                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.75,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: filteredMenu.length,
                  itemBuilder: (context, index) {
                    return MenuItemCard(
                      menuItem: filteredMenu[index],
                      onAdd: (item, {variantId, variantName}) {
                        _addToCart(
                          item,
                          variantId: variantId,
                          variantName: variantName,
                        );
                      },
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('خطا: $err')),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _cartItems.isNotEmpty
          ? Container(
              color: AppTheme.surfaceWhite,
              padding: const EdgeInsets.all(16),
              child: ElevatedButton(
                onPressed: _submitOrder,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accentAmber,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  'ثبت سفارش (${_cartItems.values.fold(0, (sum, item) => sum + item.quantity)} آیتم)',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            )
          : null,
    );
  }

  void _showCartSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'سبد خرید',
                    style: TextStyle(
                      fontFamily: 'DMSerifDisplay',
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.inkStrong,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ..._cartItems.entries.map((entry) {
                    final item = entry.value;
                    return ListTile(
                      title: Text(item.name),
                      subtitle: item.variantName != null
                          ? Text(item.variantName!)
                          : null,
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline),
                            onPressed: () {
                              setState(() => _removeFromCart(entry.key));
                              setModalState(() {});
                            },
                          ),
                          Text('${item.quantity}'),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline),
                            onPressed: () {
                              setState(() {
                                _cartItems[entry.key] = item.copyWith(
                                  quantity: item.quantity + 1,
                                );
                              });
                              setModalState(() {});
                            },
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _StationChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _StationChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onTap(),
        backgroundColor: AppTheme.paperBackground,
        selectedColor: AppTheme.amberTint,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.accentAmber : AppTheme.inkMuted,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
    );
  }
}

class CartItem {
  final String menuItemId;
  final String name;
  final String? variantId;
  final String? variantName;
  final int unitPrice; // Integer Toman (base price, no tax)
  final int quantity;
  final Station station;

  CartItem({
    required this.menuItemId,
    required this.name,
    this.variantId,
    this.variantName,
    required this.unitPrice,
    required this.quantity,
    required this.station,
  });

  CartItem copyWith({
    String? menuItemId,
    String? name,
    String? variantId,
    String? variantName,
    int? unitPrice,
    int? quantity,
    Station? station,
  }) {
    return CartItem(
      menuItemId: menuItemId ?? this.menuItemId,
      name: name ?? this.name,
      variantId: variantId ?? this.variantId,
      variantName: variantName ?? this.variantName,
      unitPrice: unitPrice ?? this.unitPrice,
      quantity: quantity ?? this.quantity,
      station: station ?? this.station,
    );
  }
}
```

---

## **9. Widgets**

### **widgets/order_card.dart**
```dart
import 'package:flutter/material.dart';
import '../models/order.dart';
import '../config/theme.dart';
import 'status_badge.dart';

// OrderCard displays an OrderSummary (list view) without items.
// For the full detail view, use OrderDetailSheet.
class OrderCard extends StatelessWidget {
  final OrderSummary order;
  final VoidCallback? onTap;

  const OrderCard({
    super.key,
    required this.order,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppTheme.borderLine, width: 1),
      ),
      color: AppTheme.surfaceWhite,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.amberTint,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'میز ${order.tableNumber ?? '-'}',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: AppTheme.inkStrong,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '#${order.id.substring(0, 8)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.inkMuted,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  StatusBadge(status: order.status),
                ],
              ),

              const Divider(height: 20),

              // Footer row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Waiter name
                  Row(
                    children: [
                      Icon(
                        Icons.person_outline,
                        size: 16,
                        color: AppTheme.inkMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        order.createdBy.isEmpty ? 'نامشخص' : order.createdBy,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.inkMuted,
                        ),
                      ),
                    ],
                  ),

                  // Time
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 16,
                        color: AppTheme.inkMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatTime(order.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.inkMuted,
                        ),
                      ),
                    ],
                  ),

                  // Total price (int Toman)
                  Text(
                    '${_formatPrice(order.total)} تومان',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.inkStrong,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _formatPrice(int price) {
    final formatted = price.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
    return formatted;
  }
}
```

### **widgets/status_badge.dart**
```dart
import 'package:flutter/material.dart';
import '../models/order.dart';
import '../config/theme.dart';

class StatusBadge extends StatelessWidget {
  final OrderStatus status;
  final bool compact;

  const StatusBadge({
    super.key,
    required this.status,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final config = _statusConfig[status]!;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: config.backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: config.borderColor, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: config.dotColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            config.label,
            style: TextStyle(
              fontSize: compact ? 11 : 12,
              fontWeight: FontWeight.w600,
              color: config.textColor,
            ),
          ),
        ],
      ),
    );
  }

  // Order-level statuses matching Go service:
  // DRAFT, PENDING, SENT, IN_PROGRESS, READY, DELIVERED, CANCELLED
  static final _statusConfig = {
    OrderStatus.draft: _StatusConfig(
      label: 'پیش‌نویس',
      backgroundColor: const Color(0xFFF5F5F5),
      borderColor: const Color(0xFFBDBDBD),
      dotColor: const Color(0xFF9E9E9E),
      textColor: const Color(0xFF616161),
    ),
    OrderStatus.pending: _StatusConfig(
      label: 'در انتظار',
      backgroundColor: const Color(0xFFFFF8E1),
      borderColor: const Color(0xFFFFE082),
      dotColor: const Color(0xFFFFC107),
      textColor: const Color(0xFF795548),
    ),
    OrderStatus.sent: _StatusConfig(
      label: 'ارسال شده',
      backgroundColor: const Color(0xFFE3F2FD),
      borderColor: const Color(0xFF90CAF9),
      dotColor: const Color(0xFF2196F3),
      textColor: const Color(0xFF1565C0),
    ),
    OrderStatus.inProgress: _StatusConfig(
      label: 'در حال آماده‌سازی',
      backgroundColor: const Color(0xFFE3F2FD),
      borderColor: const Color(0xFF90CAF9),
      dotColor: const Color(0xFF2196F3),
      textColor: const Color(0xFF1565C0),
    ),
    OrderStatus.ready: _StatusConfig(
      label: 'آماده',
      backgroundColor: const Color(0xFFE8F5E9),
      borderColor: const Color(0xFFA5D6A7),
      dotColor: const Color(0xFF4CAF50),
      textColor: const Color(0xFF2E7D32),
    ),
    OrderStatus.delivered: _StatusConfig(
      label: 'تحویل داده شد',
      backgroundColor: const Color(0xFFF3E5F5),
      borderColor: const Color(0xFFCE93D8),
      dotColor: const Color(0xFF9C27B0),
      textColor: const Color(0xFF6A1B9A),
    ),
    OrderStatus.cancelled: _StatusConfig(
      label: 'لغو شده',
      backgroundColor: const Color(0xFFFFEBEE),
      borderColor: const Color(0xFFEF9A9A),
      dotColor: const Color(0xFFF44336),
      textColor: const Color(0xFFC62828),
    ),
  };
}

class _StatusConfig {
  final String label;
  final Color backgroundColor;
  final Color borderColor;
  final Color dotColor;
  final Color textColor;

  const _StatusConfig({
    required this.label,
    required this.backgroundColor,
    required this.borderColor,
    required this.dotColor,
    required this.textColor,
  });
}

// Item-level status badge
class ItemStatusBadge extends StatelessWidget {
  final ItemStatus status;

  const ItemStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _itemStatusConfig[status]!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: config.backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        config.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: config.textColor,
        ),
      ),
    );
  }

  static final _itemStatusConfig = {
    ItemStatus.pending: _StatusConfig(
      label: 'در انتظار',
      backgroundColor: const Color(0xFFFFF8E1),
      borderColor: const Color(0xFFFFE082),
      dotColor: const Color(0xFFFFC107),
      textColor: const Color(0xFF795548),
    ),
    ItemStatus.sent: _StatusConfig(
      label: 'ارسال شد',
      backgroundColor: const Color(0xFFE3F2FD),
      borderColor: const Color(0xFF90CAF9),
      dotColor: const Color(0xFF2196F3),
      textColor: const Color(0xFF1565C0),
    ),
    ItemStatus.preparing: _StatusConfig(
      label: 'در حال آماده‌سازی',
      backgroundColor: const Color(0xFFE3F2FD),
      borderColor: const Color(0xFF90CAF9),
      dotColor: const Color(0xFF2196F3),
      textColor: const Color(0xFF1565C0),
    ),
    ItemStatus.ready: _StatusConfig(
      label: 'آماده',
      backgroundColor: const Color(0xFFE8F5E9),
      borderColor: const Color(0xFFA5D6A7),
      dotColor: const Color(0xFF4CAF50),
      textColor: const Color(0xFF2E7D32),
    ),
    ItemStatus.delivered: _StatusConfig(
      label: 'تحویل شد',
      backgroundColor: const Color(0xFFF3E5F5),
      borderColor: const Color(0xFFCE93D8),
      dotColor: const Color(0xFF9C27B0),
      textColor: const Color(0xFF6A1B9A),
    ),
    ItemStatus.cancelled: _StatusConfig(
      label: 'لغو',
      backgroundColor: const Color(0xFFFFEBEE),
      borderColor: const Color(0xFFEF9A9A),
      dotColor: const Color(0xFFF44336),
      textColor: const Color(0xFFC62828),
    ),
  };
}
```

### **widgets/menu_item_card.dart**
```dart
import 'package:flutter/material.dart';
import '../models/menu_item.dart';
import '../config/theme.dart';

class MenuItemCard extends ConsumerStatefulWidget {
  final MenuItem menuItem;
  final void Function(
    MenuItem item, {
    String? variantId,
    String? variantName,
  }) onAdd;

  const MenuItemCard({
    super.key,
    required this.menuItem,
    required this.onAdd,
  });

  @override
  ConsumerState<MenuItemCard> createState() => _MenuItemCardState();
}

class _MenuItemCardState extends ConsumerState<MenuItemCard> {
  List<ItemVariant>? _variants;
  bool _loadingVariants = false;

  @override
  Widget build(BuildContext context) {
    final item = widget.menuItem;
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppTheme.borderLine, width: 1),
      ),
      color: AppTheme.surfaceWhite,
      child: InkWell(
        onTap: () => _handleTap(context),
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Item image (photoAssetId → resolved URL via storage service)
            Expanded(
              flex: 3,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
                child: item.photoAssetId != null
                    ? Image.network(
                        // TODO: resolve photoAssetId to URL via storage service
                        '/api/assets/${item.photoAssetId}',
                        fit: BoxFit.cover,
                        width: double.infinity,
                        errorBuilder: (_, __, ___) => _PlaceholderImage(),
                      )
                    : _PlaceholderImage(),
              ),
            ),

            // Item info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Name (use nameFa)
                    Text(
                      item.nameFa,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppTheme.inkText,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Price row + add button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Price (int Toman)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_variants != null && _variants!.isNotEmpty)
                              Text(
                                'از',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.inkMuted,
                                ),
                              ),
                            Text(
                              _formatPrice(item.priceToman),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.accentAmber,
                              ),
                            ),
                          ],
                        ),

                        // Add button
                        GestureDetector(
                          onTap: () => _handleTap(context),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: AppTheme.accentAmber,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.add,
                              color: Colors.white,
                              size: 18,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Station tag (only KITCHEN/BAR exist)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 4),
              decoration: BoxDecoration(
                color: _stationColor(item.station),
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(16),
                ),
              ),
              child: Text(
                item.station.label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleTap(BuildContext context) async {
    // Fetch variants from the API (separate endpoint)
    if (_variants == null && !_loadingVariants) {
      _loadingVariants = true;
      try {
        final api = ref.read(apiServiceProvider);
        final variants = await api.getItemVariants(widget.menuItem.id);
        if (mounted) {
          setState(() {
            _variants = variants;
            _loadingVariants = false;
          });
        }
      } catch (_) {
        if (mounted) setState(() => _loadingVariants = false);
      }
    }

    if (_variants != null && _variants!.isNotEmpty) {
      _showVariantSheet(context);
    } else {
      widget.onAdd(widget.menuItem);
    }
  }

  void _showVariantSheet(BuildContext context) {
    final variants = _variants ?? <ItemVariant>[];
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.menuItem.nameFa,
                style: TextStyle(
                  fontFamily: 'DMSerifDisplay',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.inkStrong,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'یک گزینه انتخاب کنید',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.inkMuted,
                ),
              ),
              const SizedBox(height: 16),
              ...variants.map((variant) {
                final totalPrice = widget.menuItem.priceToman + variant.priceModifier;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(variant.nameFa),
                  trailing: Text(
                    _formatPrice(totalPrice),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppTheme.accentAmber,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    widget.onAdd(
                      widget.menuItem,
                      variantId: variant.id,
                      variantName: variant.nameFa,
                    );
                  },
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  String _formatPrice(int price) {
    return '$price تومان';
  }

  Color _stationColor(Station station) {
    return switch (station) {
      Station.kitchen => const Color(0xFFE53935),
      Station.bar => const Color(0xFF8E24AA),
    };
  }
}

class _PlaceholderImage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF5F0E8),
      child: Icon(
        Icons.restaurant,
        size: 40,
        color: AppTheme.inkMuted,
      ),
    );
  }
}
```

### **widgets/connectivity_banner.dart**
```dart
import 'package:flutter/material.dart';
import '../config/theme.dart';

class ConnectivityBanner extends StatelessWidget {
  final bool isOnline;

  const ConnectivityBanner({super.key, required this.isOnline});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      height: isOnline ? 0 : 36,
      color: const Color(0xFFC62828),
      child: isOnline
          ? const SizedBox.shrink()
          : const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.wifi_off, color: Colors.white, size: 16),
                SizedBox(width: 8),
                Text(
                  'اتصال اینترنت قطع است — سفارش‌ها ذخیره می‌شوند',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
    );
  }
}
```

### **widgets/order_detail_sheet.dart**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import '../providers/orders_provider.dart';
import '../config/theme.dart';
import 'status_badge.dart';

class OrderDetailSheet extends ConsumerWidget {
  final Order order;

  const OrderDetailSheet({super.key, required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch live order state so WebSocket updates reflect immediately
    final state = ref.watch(ordersProvider);
    final liveOrder = state.orderDetails[order.id] ?? order;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.95,
      minChildSize: 0.4,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceWhite,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.borderLine,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'میز ${liveOrder.tableNumber ?? '-'}',
                          style: TextStyle(
                            fontFamily: 'DMSerifDisplay',
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.inkStrong,
                          ),
                        ),
                        Text(
                          '#${liveOrder.id.substring(0, 8)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.inkMuted,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                    StatusBadge(status: liveOrder.status),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Items list
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  children: [
                    ...liveOrder.items.map((item) => _OrderItemTile(
                      item: item,
                      orderId: liveOrder.id,
                    )),

                    if (liveOrder.notes != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.amberTint,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.notes,
                              size: 18,
                              color: AppTheme.accentAmber,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                liveOrder.notes!,
                                style: TextStyle(
                                  color: AppTheme.inkText,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Total (int Toman)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'مجموع',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.inkStrong,
                          ),
                        ),
                        Text(
                          '${_formatPrice(liveOrder.total)} تومان',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.accentAmber,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Actions
              if (liveOrder.status == OrderStatus.draft ||
                  liveOrder.status == OrderStatus.pending)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Row(
                    children: [
                      // Send to kitchen (POST /api/orders/{id}/send)
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            ref.read(ordersProvider.notifier).sendToKitchen(
                              liveOrder.id,
                            );
                            Navigator.pop(context);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2196F3),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'ارسال به آشپزخانه',
                            style: TextStyle(color: Colors.white),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Cancel order
                      OutlinedButton(
                        onPressed: () => _confirmCancel(context, ref, liveOrder),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFC62828),
                          side: const BorderSide(color: Color(0xFFC62828)),
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 20,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('لغو'),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  void _confirmCancel(BuildContext context, WidgetRef ref, Order order) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('لغو سفارش'),
        content: const Text('آیا مطمئن هستید؟ این عمل قابل بازگشت نیست.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('خیر'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // Cancel each item individually since there's no
              // "cancel entire order" endpoint in the Go service
              for (final item in order.items) {
                ref.read(ordersProvider.notifier).cancelOrderItem(
                  order.id,
                  item.id,
                );
              }
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFC62828),
            ),
            child: const Text('بله، لغو شود'),
          ),
        ],
      ),
    );
  }

  String _formatPrice(int price) {
    return price.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
  }
}

class _OrderItemTile extends ConsumerWidget {
  final OrderItem item;
  final String orderId;

  const _OrderItemTile({required this.item, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCancelled = item.status == ItemStatus.cancelled;

    return Opacity(
      opacity: isCancelled ? 0.5 : 1.0,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isCancelled
              ? const Color(0xFFFFF5F5)
              : AppTheme.paperBackground,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isCancelled
                ? const Color(0xFFEF9A9A)
                : AppTheme.borderLine,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                    Text(
                      item.variantName != null
                          ? '${item.menuItemName} — ${item.variantName}'
                          : item.menuItemName,
                      style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppTheme.inkStrong,
                      decoration: isCancelled
                          ? TextDecoration.lineThrough
                          : null,
                    ),
                  ),
                  if (item.notes != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.notes!,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.inkMuted,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Quantity badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.amberTint,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '×${item.quantity}',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppTheme.inkStrong,
                ),
              ),
            ),

            const SizedBox(width: 8),

            // Item status badge
            ItemStatusBadge(status: item.status),

            const SizedBox(width: 8),

            // Cancel item button (only if modifiable)
            if (item.status == ItemStatus.pending ||
                item.status == ItemStatus.preparing)
              GestureDetector(
                onTap: () => _confirmCancelItem(context, ref),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(
                    Icons.close,
                    size: 16,
                    color: Color(0xFFC62828),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _confirmCancelItem(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('لغو آیتم'),
        content: Text('آیا "${item.menuItemName}" حذف شود؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('خیر'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(ordersProvider.notifier).cancelOrderItem(
                orderId,
                item.id,
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFC62828),
            ),
            child: const Text('حذف شود'),
          ),
        ],
      ),
    );
  }
}
```

---

## **10. Testing Setup**

### **pubspec.yaml** — test dependencies
```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  mocktail: ^1.0.4
  riverpod_test: ^0.1.0  # or use ProviderContainer directly
  drift_dev: ^2.20.0
  build_runner: ^2.4.9
  fake_async: ^1.3.1
```

### **test/helpers/test_providers.dart**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';
import '../../lib/services/api_service.dart';
import '../../lib/services/websocket_service.dart';
import '../../lib/services/auth_service.dart';
import '../../lib/providers/orders_provider.dart';

// Mocks
class MockApiService extends Mock implements ApiService {}
class MockWebSocketService extends Mock implements WebSocketService {}
class MockAuthService extends Mock implements AuthService {}

// Helper: create ProviderContainer with overrides
ProviderContainer createTestContainer({
  ApiService? apiService,
  WebSocketService? wsService,
  AuthService? authService,
}) {
  return ProviderContainer(
    overrides: [
      if (apiService != null)
        apiServiceProvider.overrideWithValue(apiService),
      if (wsService != null)
        webSocketServiceProvider.overrideWithValue(wsService),
      if (authService != null)
        authServiceProvider.overrideWithValue(authService),
    ],
  );
}

// Note: websocketServiceProvider is a StateProvider now.
// For tests, you can set it directly:
//   container.read(websocketServiceProvider.notifier).state = mockWs;
```

### **test/models/order_test.dart**
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:waiter_app/models/order.dart';

void main() {
  group('Order (detail) model', () {
    final sampleJson = {
      'id': 'abc-123',
      'venueId': 'venue-1',
      'waiterId': 'waiter-1',
      'tableNumber': '5',
      'guestCount': 2,
      'status': 'PENDING',
      'subtotal': 30000,
      'total': 30000,
      'notes': null,
      'createdAt': '2026-06-27T10:00:00.000Z',
      'createdBy': 'علی',
      'items': [
        {
          'id': 'item-1',
          'orderId': 'abc-123',
          'menuItemId': 'menu-1',
          'menuItemName': 'چای',
          'variantId': null,
          'variantName': null,
          'quantity': 2,
          'unitPrice': 15000,
          'totalPrice': 30000,
          'status': 'PENDING',
          'station': 'BAR',
          'notes': null,
          'courseNumber': 1,
          'createdAt': '2026-06-27T10:00:00.000Z',
        }
      ],
    };

    test('fromJson parses correctly', () {
      final order = Order.fromJson(sampleJson);

      expect(order.id, 'abc-123');
      expect(order.tableNumber, '5');
      expect(order.status, OrderStatus.pending);
      expect(order.items.length, 1);
      expect(order.items.first.quantity, 2);
      expect(order.total, 30000);
      expect(order.guestCount, 2);
    });

    test('toJson round-trips correctly', () {
      final order = Order.fromJson(sampleJson);
      final json = order.toJson();

      expect(json['id'], 'abc-123');
      expect(json['status'], 'PENDING');
      expect(json['total'], 30000);
      expect((json['items'] as List).length, 1);
    });

    test('copyWith preserves unchanged fields', () {
      final order = Order.fromJson(sampleJson);
      final updated = order.copyWith(status: OrderStatus.inProgress);

      expect(updated.status, OrderStatus.inProgress);
      expect(updated.tableNumber, order.tableNumber);
      expect(updated.items, order.items);
    });
  });

  group('OrderSummary (list) model', () {
    test('fromJson parses list response correctly', () {
      final json = {
        'id': 'order-1',
        'tableNumber': '5',
        'status': 'DRAFT',
        'total': 45000,
        'createdAt': '2026-06-27T10:00:00.000Z',
        'createdBy': 'Waiter Name',
      };

      final summary = OrderSummary.fromJson(json);
      expect(summary.id, 'order-1');
      expect(summary.tableNumber, '5');
      expect(summary.status, OrderStatus.draft);
      expect(summary.total, 45000);
      expect(summary.createdBy, 'Waiter Name');
    });

    test('fromJson handles missing tableNumber', () {
      final json = {
        'id': 'order-2',
        'status': 'PENDING',
        'total': 0,
        'createdAt': '2026-06-27T10:00:00.000Z',
        'createdBy': '',
      };

      final summary = OrderSummary.fromJson(json);
      expect(summary.tableNumber, isNull);
    });
  });
}
```

### **test/providers/orders_provider_test.dart**
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:waiter_app/models/order.dart';
import 'package:waiter_app/providers/orders_provider.dart';
import '../helpers/test_providers.dart';

void main() {
  late MockApiService mockApi;
  late MockWebSocketService mockWs;
  late ProviderContainer container;

  final sampleSummary = OrderSummary(
    id: 'order-1',
    tableNumber: '3',
    status: OrderStatus.pending,
    total: 45000,
    createdAt: DateTime.now(),
    createdBy: 'علی',
  );

  setUp(() {
    mockApi = MockApiService();
    mockWs = MockWebSocketService();
    container = createTestContainer(
      apiService: mockApi,
      wsService: mockWs,
    );

    // Default stub: empty stream for WS events
    when(() => mockWs.events).thenAnswer(
      (_) => const Stream.empty(),
    );
  });

  tearDown(() => container.dispose());

  group('OrdersProvider', () {
    test('initial state is empty and not loading', () {
      final state = container.read(ordersProvider);
      expect(state.summaries, isEmpty);
      expect(state.isLoading, false);
    });

    test('loadOrders populates state on success', () async {
      when(() => mockApi.getOrders()).thenAnswer(
        (_) async => [sampleSummary],
      );

      await container.read(ordersProvider.notifier).loadOrders();
      final state = container.read(ordersProvider);

      expect(state.summaries.length, 1);
      expect(state.summaries.first.id, 'order-1');
      expect(state.isLoading, false);
      expect(state.error, isNull);
    });

    test('loadOrders sets error on failure', () async {
      when(() => mockApi.getOrders()).thenThrow(Exception('Network error'));

      await container.read(ordersProvider.notifier).loadOrders();
      final state = container.read(ordersProvider);

      expect(state.summaries, isEmpty);
      expect(state.error, isNotNull);
    });

    test('WebSocket order_status_changed updates summary', () async {
      when(() => mockApi.getOrders()).thenAnswer((_) async => [sampleSummary]);

      await container.read(ordersProvider.notifier).loadOrders();

      // Simulate WS event
      container
          .read(ordersProvider.notifier)
          .handleWebSocketEvent(WebSocketEvent(
            type: 'order_status_changed',
            payload: {'orderId': 'order-1', 'status': 'DELIVERED'},
            timestamp: DateTime.now(),
          ));

      final state = container.read(ordersProvider);
      expect(state.summaries.first.status, OrderStatus.delivered);
    });
  });
}
```

### **test/services/api_service_test.dart**
```dart
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:waiter_app/services/api_service.dart';
import 'package:waiter_app/models/order.dart';

class MockDio extends Mock implements Dio {}
class MockOrderDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late MockOrderDio mockOrderDio;
  late ApiService apiService;

  setUp(() {
    mockDio = MockDio();
    mockOrderDio = MockOrderDio();
    apiService = ApiService(mockDio, mockOrderDio);
  });

  group('ApiService.getOrders', () {
    test('returns list of OrderSummary on 200', () async {
      when(() => mockOrderDio.get(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => Response(
            requestOptions: RequestOptions(path: '/api/orders'),
            statusCode: 200,
            data: [
              {
                'id': 'order-1',
                'tableNumber': '3',
                'status': 'PENDING',
                'total': 45000,
                'createdAt': '2026-06-27T10:00:00.000Z',
                'createdBy': 'علی',
              }
            ],
          ));

      final orders = await apiService.getOrders();

      expect(orders.length, 1);
      expect(orders.first.id, 'order-1');
      expect(orders.first.status, OrderStatus.pending);
      expect(orders.first.total, 45000);
    });
  });

  group('ApiService.createOrder', () {
    test('creates empty order and returns orderId', () async {
      when(() => mockOrderDio.post(
            any(),
            data: any(named: 'data'),
          )).thenAnswer((_) async => Response(
            requestOptions: RequestOptions(path: '/api/orders'),
            statusCode: 201,
            data: {'orderId': 'new-order-1'},
          ));

      final orderId = await apiService.createOrder(
        tableNumber: '5',
        guestCount: 2,
      );

      expect(orderId, 'new-order-1');
    });
  });

  group('ApiService.addItemToOrder', () {
    test('adds item and returns itemId', () async {
      when(() => mockOrderDio.post(
            any(),
            data: any(named: 'data'),
          )).thenAnswer((_) async => Response(
            requestOptions: RequestOptions(path: '/api/orders/o1/items'),
            statusCode: 201,
            data: {'itemId': 'item-1'},
          ));

      final itemId = await apiService.addItemToOrder(
        'o1',
        menuItemId: 'menu-1',
        quantity: 2,
      );

      expect(itemId, 'item-1');
    });
  });
}
```

### **test/widgets/order_card_test.dart**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waiter_app/models/order.dart';
import 'package:waiter_app/widgets/order_card.dart';

void main() {
  final sampleOrder = OrderSummary(
    id: 'abc-123-def-456',
    tableNumber: '7',
    status: OrderStatus.pending,
    total: 90000,
    createdAt: DateTime(2026, 6, 27, 10, 30),
    createdBy: 'علی',
  );

  testWidgets('displays table number', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OrderCard(order: sampleOrder),
        ),
      ),
    );

    expect(find.text('میز 7'), findsOneWidget);
  });

  testWidgets('calls onTap when tapped', (tester) async {
    bool tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OrderCard(
            order: sampleOrder,
            onTap: () => tapped = true,
          ),
        ),
      ),
    );

    await tester.tap(find.byType(OrderCard));
    expect(tapped, isTrue);
  });

  testWidgets('shows correct status badge', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OrderCard(order: sampleOrder),
        ),
      ),
    );

    expect(find.text('در انتظار'), findsOneWidget);
  });
}
```

### **test/widgets/connectivity_banner_test.dart**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waiter_app/widgets/connectivity_banner.dart';

void main() {
  testWidgets('shows message when offline', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ConnectivityBanner(isOnline: false),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 350));
    expect(find.byIcon(Icons.wifi_off), findsOneWidget);
  });

  testWidgets('hides when online', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ConnectivityBanner(isOnline: true),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 350));
    expect(find.byIcon(Icons.wifi_off), findsNothing);
  });
}
```

### **Running tests**
```bash
# All tests
flutter test

# With coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html

# Single file
flutter test test/providers/orders_provider_test.dart

# Watch mode (via cli)
flutter test --reporter expanded
```

---

## **ساختار نهایی پروژه Flutter**

lib/
├── config/
│   ├── constants.dart
│   └── theme.dart
├── models/
│   ├── order.dart
│   ├── menu_item.dart
│   └── websocket_event.dart
├── services/
│   ├── auth_service.dart
│   ├── api_service.dart
│   ├── websocket_service.dart
│   ├── offline_queue_service.dart
│   └── storage_service.dart
├── providers/
│   ├── auth_provider.dart
│   ├── connectivity_provider.dart
│   ├── menu_provider.dart
│   ├── orders_provider.dart
│   └── providers.dart
├── screens/
│   ├── login_screen.dart
│   ├── orders_list_screen.dart
│   └── new_order_screen.dart
├── widgets/
│   ├── order_card.dart
│   ├── status_badge.dart
│   ├── menu_item_card.dart
│   ├── connectivity_banner.dart
│   └── order_detail_sheet.dart
└── main.dart

test/
├── helpers/
│   └── test_providers.dart
├── models/
│   └── order_test.dart
├── providers/
│   └── orders_provider_test.dart
├── services/
│   └── api_service_test.dart
└── widgets/
    ├── order_card_test.dart
    └── connectivity_banner_test.dart


---

