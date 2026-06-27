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
class AppConstants {
  // API Configuration
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://yourdomain.com',
  );
  static const String wsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'wss://yourdomain.com/ws',
  );
  
  // Session
  static const String sessionCookieName = 'mofe_session';
  
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

class AppTheme {
  // mofé Colors (matching web app)
  static const Color paperBackground = Color(0xFFF5F0E6);
  static const Color inkText = Color(0xFF111111);
  static const Color warmAccent = Color(0xFFD4A574);
  
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.light(
      primary: warmAccent,
      background: paperBackground,
      surface: Colors.white,
      onPrimary: Colors.white,
      onBackground: inkText,
      onSurface: inkText,
    ),
    
    // Persian/RTL Typography
    fontFamily: 'Vazirmatn',  // Self-hosted Persian font
    textTheme: const TextTheme(
      displayLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
      bodyLarge: TextStyle(fontSize: 16),
      bodyMedium: TextStyle(fontSize: 14),
    ),
    
    // Card Style
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
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

enum OrderStatus {
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
    return OrderStatus.values.firstWhere((e) => e.value == value);
  }
}

class Order extends Equatable {
  final String id;
  final String venueId;
  final String waiterId;
  final String waiterName;
  final int tableNumber;
  final OrderStatus status;
  final List<OrderItem> items;
  final double subtotal;
  final double tax;
  final double total;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // Offline tracking
  final bool isSynced;
  final String? localId;  // UUID for offline orders
  
  const Order({
    required this.id,
    required this.venueId,
    required this.waiterId,
    required this.waiterName,
    required this.tableNumber,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.tax,
    required this.total,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = true,
    this.localId,
  });
  
  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      venueId: json['venueId'],
      waiterId: json['waiterId'],
      waiterName: json['waiterName'],
      tableNumber: json['tableNumber'],
      status: OrderStatus.fromString(json['status']),
      items: (json['items'] as List)
          .map((i) => OrderItem.fromJson(i))
          .toList(),
      subtotal: (json['subtotal'] as num).toDouble(),
      tax: (json['tax'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      notes: json['notes'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
  
  Map<String, dynamic> toJson() => {
    'id': id,
    'venueId': venueId,
    'waiterId': waiterId,
    'waiterName': waiterName,
    'tableNumber': tableNumber,
    'status': status.value,
    'items': items.map((i) => i.toJson()).toList(),
    'subtotal': subtotal,
    'tax': tax,
    'total': total,
    'notes': notes,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
  
  Order copyWith({
    OrderStatus? status,
    List<OrderItem>? items,
    double? subtotal,
    double? tax,
    double? total,
    bool? isSynced,
  }) {
    return Order(
      id: id,
      venueId: venueId,
      waiterId: waiterId,
      waiterName: waiterName,
      tableNumber: tableNumber,
      status: status ?? this.status,
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      tax: tax ?? this.tax,
      total: total ?? this.total,
      notes: notes,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      isSynced: isSynced ?? this.isSynced,
      localId: localId,
    );
  }
  
  @override
  List<Object?> get props => [id, status, items, updatedAt];
}
```

### **models/order_item.dart**
```dart
enum ItemStatus {
  pending('PENDING', 'در انتظار'),
  sent('SENT', 'ارسال شده'),
  preparing('PREPARING', 'در حال آماده‌سازی'),
  ready('READY', 'آماده'),
  served('SERVED', 'سرو شده'),
  cancelled('CANCELLED', 'لغو شده');
  
  const ItemStatus(this.value, this.label);
  final String value;
  final String label;
  
  static ItemStatus fromString(String value) {
    return ItemStatus.values.firstWhere((e) => e.value == value);
  }
}

enum Station {
  kitchen('KITCHEN', 'آشپزخانه'),
  bar('BAR', 'بار');
  
  const Station(this.value, this.label);
  final String value;
  final String label;
  
  static Station fromString(String value) {
    return Station.values.firstWhere((e) => e.value == value);
  }
}

class OrderItem extends Equatable {
  final String id;
  final String orderId;
  final String menuItemId;
  final String name;
  final String? variantName;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final ItemStatus status;
  final Station station;
  final String? notes;
  final DateTime createdAt;
  final DateTime? sentAt;
  final DateTime? readyAt;
  
  const OrderItem({
    required this.id,
    required this.orderId,
    required this.menuItemId,
    required this.name,
    this.variantName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.status,
    required this.station,
    this.notes,
    required this.createdAt,
    this.sentAt,
    this.readyAt,
  });
  
  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'],
      orderId: json['orderId'],
      menuItemId: json['menuItemId'],
      name: json['name'],
      variantName: json['variantName'],
      quantity: json['quantity'],
      unitPrice: (json['unitPrice'] as num).toDouble(),
      totalPrice: (json['totalPrice'] as num).toDouble(),
      status: ItemStatus.fromString(json['status']),
      station: Station.fromString(json['station']),
      notes: json['notes'],
      createdAt: DateTime.parse(json['createdAt']),
      sentAt: json['sentAt'] != null ? DateTime.parse(json['sentAt']) : null,
      readyAt: json['readyAt'] != null ? DateTime.parse(json['readyAt']) : null,
    );
  }
  
  Map<String, dynamic> toJson() => {
    'id': id,
    'orderId': orderId,
    'menuItemId': menuItemId,
    'name': name,
    'variantName': variantName,
    'quantity': quantity,
    'unitPrice': unitPrice,
    'totalPrice': totalPrice,
    'status': status.value,
    'station': station.value,
    'notes': notes,
    'createdAt': createdAt.toIso8601String(),
    'sentAt': sentAt?.toIso8601String(),
    'readyAt': readyAt?.toIso8601String(),
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
      name: name,
      variantName: variantName,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice,
      totalPrice: unitPrice * (quantity ?? this.quantity),
      status: status ?? this.status,
      station: station,
      notes: notes ?? this.notes,
      createdAt: createdAt,
      sentAt: sentAt,
      readyAt: readyAt,
    );
  }
  
  @override
  List<Object?> get props => [id, quantity, status, notes];
}
```

### **models/menu_item.dart**
```dart
class MenuItem extends Equatable {
  final String id;
  final String name;
  final String? description;
  final double basePrice;
  final List<ItemVariant> variants;
  final Station station;
  final bool isAvailable;
  
  const MenuItem({
    required this.id,
    required this.name,
    this.description,
    required this.basePrice,
    this.variants = const [],
    required this.station,
    this.isAvailable = true,
  });
  
  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      basePrice: (json['basePrice'] as num).toDouble(),
      variants: (json['variants'] as List?)
          ?.map((v) => ItemVariant.fromJson(v))
          .toList() ?? [],
      station: Station.fromString(json['station']),
      isAvailable: json['isAvailable'] ?? true,
    );
  }
  
  @override
  List<Object?> get props => [id, name, basePrice, variants];
}

class ItemVariant extends Equatable {
  final String id;
  final String name;
  final double priceModifier;
  
  const ItemVariant({
    required this.id,
    required this.name,
    required this.priceModifier,
  });
  
  factory ItemVariant.fromJson(Map<String, dynamic> json) {
    return ItemVariant(
      id: json['id'],
      name: json['name'],
      priceModifier: (json['priceModifier'] as num).toDouble(),
    );
  }
  
  @override
  List<Object?> get props => [id, name, priceModifier];
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
  
  AuthService(this._dio, this._storage);
  
  Future<SessionData?> login(String phoneNumber, String password) async {
    try {
      final response = await _dio.post(
        '${AppConstants.baseUrl}/api/auth/login',
        data: {
          'phoneNumber': phoneNumber,
          'password': password,
        },
      );
      
      // Extract session cookie from response
      final cookies = response.headers['set-cookie'];
      final sessionCookie = cookies?.firstWhere(
        (c) => c.startsWith('${AppConstants.sessionCookieName}='),
        orElse: () => '',
      );
      
      if (sessionCookie != null && sessionCookie.isNotEmpty) {
        final token = _extractTokenFromCookie(sessionCookie);
        await _storage.write(key: 'session_token', value: token);
        
        return SessionData(
          userId: response.data['userId'],
          venueId: response.data['venueId'],
          venueName: response.data['venueName'],
          userName: response.data['userName'],
          role: response.data['role'],
        );
      }
      
      return null;
    } catch (e) {
      rethrow;
    }
  }
  
  Future<void> logout() async {
    await _storage.delete(key: 'session_token');
    // Optionally call backend logout endpoint
  }
  
  Future<String?> getSessionToken() {
    return _storage.read(key: 'session_token');
  }
  
  String _extractTokenFromCookie(String cookie) {
    final parts = cookie.split(';')[0].split('=');
    return parts.length > 1 ? parts[1] : '';
  }
}

class SessionData {
  final String userId;
  final String venueId;
  final String venueName;
  final String userName;
  final String role;
  
  SessionData({
    required this.userId,
    required this.venueId,
    required this.venueName,
    required this.userName,
    required this.role,
  });
}
```

### **services/api_service.dart**
```dart
import 'package:dio/dio.dart';
import '../config/constants.dart';
import '../models/order.dart';
import '../models/menu_item.dart';

class ApiService {
  final Dio _dio;
  
  ApiService(this._dio);
  
  // Orders
  Future<Order> createOrder({
    required int tableNumber,
    required List<Map<String, dynamic>> items,
    String? notes,
  }) async {
    final response = await _dio.post(
      '${AppConstants.baseUrl}/api/orders',
      data: {
        'tableNumber': tableNumber,
        'items': items,
        'notes': notes,
      },
    );
    
    return Order.fromJson(response.data);
  }
  
  Future<List<Order>> getOrders({
    OrderStatus? status,
    int? tableNumber,
  }) async {
    final response = await _dio.get(
      '${AppConstants.baseUrl}/api/orders',
      queryParameters: {
        if (status != null) 'status': status.value,
        if (tableNumber != null) 'table': tableNumber,
      },
    );
    
    return (response.data as List)
        .map((o) => Order.fromJson(o))
        .toList();
  }
  
  Future<Order> getOrder(String orderId) async {
    final response = await _dio.get(
      '${AppConstants.baseUrl}/api/orders/$orderId',
    );
    
    return Order.fromJson(response.data);
  }
  
  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    await _dio.patch(
      '${AppConstants.baseUrl}/api/orders/$orderId',
      data: {'status': status.value},
    );
  }
  
  // Order Items
  Future<void> addItemToOrder(String orderId, Map<String, dynamic> item) async {
    await _dio.post(
      '${AppConstants.baseUrl}/api/orders/$orderId/items',
      data: item,
    );
  }
  
  Future<void> updateOrderItem(
    String orderId,
    String itemId, {
    int? quantity,
    String? notes,
  }) async {
    await _dio.patch(
      '${AppConstants.baseUrl}/api/orders/$orderId/items/$itemId',
      data: {
        if (quantity != null) 'quantity': quantity,
        if (notes != null) 'notes': notes,
      },
    );
  }
  
  Future<void> cancelOrderItem(String orderId, String itemId) async {
    await _dio.delete(
      '${AppConstants.baseUrl}/api/orders/$orderId/items/$itemId',
    );
  }
  
  // Menu
  Future<List<MenuItem>> getMenu() async {
    final response = await _dio.get(
      '${AppConstants.baseUrl}/api/menu',
    );
    
    return (response.data as List)
        .map((m) => MenuItem.fromJson(m))
        .toList();
  }
}
```

### **services/websocket_service.dart**
```dart
import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/constants.dart';
import '../models/websocket_event.dart';

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
      final uri = Uri.parse('${AppConstants.wsUrl}?session=$_sessionToken');
      _channel = WebSocketChannel.connect(uri);
      
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
  
  Future<String> queueOrder(Order order) async {
    final localId = _uuid.v4();
    final orderWithLocalId = order.copyWith(isSynced: false);
    
    await _db.insertOfflineOrder(
      localId,
      jsonEncode(orderWithLocalId.toJson()),
    );
    
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
          final orderData = jsonDecode(offlineOrder.orderJson);
          final order = Order.fromJson(orderData);
          
          // Recreate order via API
          await _api.createOrder(
            tableNumber: order.tableNumber,
            items: order.items.map((item) => {
              'menuItemId': item.menuItemId,
              'variantId': item.variantName != null ? 'variant_id' : null,
              'quantity': item.quantity,
              'notes': item.notes,
            }).toList(),
            notes: order.notes,
          );
          
          await _db.markAsSynced(offlineOrder.localId);
          
          // Delete synced orders after 24 hours
          if (offlineOrder.createdAt.difference(DateTime.now()).inHours > 24) {
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

// Dio instance with interceptors
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: AppConstants.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));
  
  // Add auth interceptor
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'session_token');
      
      if (token != null) {
        options.headers['Cookie'] = '${AppConstants.sessionCookieName}=$token';
      }
      
      return handler.next(options);
    },
    onError: (error, handler) {
      if (error.response?.statusCode == 401) {
        // Session expired - trigger logout
        ref.read(authProvider.notifier).logout();
      }
      return handler.next(error);
    },
  ));
  
  return dio;
});

final storageProvider = Provider<FlutterSecureStorage>(
  (_) => const FlutterSecureStorage(),
);

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(
    ref.watch(dioProvider),
    ref.watch(storageProvider),
  );
});

// Auth state
class AuthState {
  final SessionData? session;
  final bool isLoading;
  final String? error;
  
  const AuthState({
    this.session,
    this.isLoading = false,
    this.error,
  });
  
  bool get isAuthenticated => session != null;
  
  AuthState copyWith({
    SessionData? session,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      session: session ?? this.session,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  
  AuthNotifier(this._authService) : super(const AuthState()) {
    _checkExistingSession();
  }
  
  Future<void> _checkExistingSession() async {
    final token = await _authService.getSessionToken();
    if (token != null) {
      // Token exists, verify with backend or load cached session data
      // For now, we'll require re-login
    }
  }
  
  Future<void> login(String phoneNumber, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final session = await _authService.login(phoneNumber, password);
      
      if (session != null) {
        state = state.copyWith(session: session, isLoading: false);
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'ورود ناموفق. لطفاً دوباره تلاش کنید.',
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'خطا در اتصال به سرور',
      );
    }
  }
  
  Future<void> logout() async {
    await _authService.logout();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authServiceProvider));
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
  return ApiService(ref.watch(dioProvider));
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

final websocketServiceProvider = Provider<WebSocketService?>((ref) {
  final authState = ref.watch(authProvider);
  
  if (!authState.isAuthenticated) return null;
  
  final token = ref.watch(storageProvider).read(key: 'session_token');
  
  return token.then((t) {
    if (t == null) return null;
    final ws = WebSocketService(t);
    ws.connect();
    
    // Listen to WebSocket events and update orders
    ws.events.listen((event) {
      ref.read(ordersProvider.notifier).handleWebSocketEvent(event);
    });
    
    return ws;
  }) as WebSocketService?;
});

// Orders state
class OrdersState {
  final List<Order> orders;
  final bool isLoading;
  final String? error;
  final int pendingOfflineOrders;
  
  const OrdersState({
    this.orders = const [],
    this.isLoading = false,
    this.error,
    this.pendingOfflineOrders = 0,
  });
  
  OrdersState copyWith({
    List<Order>? orders,
    bool? isLoading,
    String? error,
    int? pendingOfflineOrders,
  }) {
    return OrdersState(
      orders: orders ?? this.orders,
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
      final orders = await _api.getOrders(status: status);
      state = state.copyWith(orders: orders, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'خطا در بارگذاری سفارشات',
      );
    }
  }
  
  Future<void> createOrder({
    required int tableNumber,
    required List<Map<String, dynamic>> items,
    String? notes,
  }) async {
    final isOnline = _ref.read(isOnlineProvider);
    
    if (!isOnline) {
      // Queue for offline sync
      final order = Order(
        id: 'pending',
        venueId: _ref.read(authProvider).session!.venueId,
        waiterId: _ref.read(authProvider).session!.userId,
        waiterName: _ref.read(authProvider).session!.userName,
        tableNumber: tableNumber,
        status: OrderStatus.pending,
        items: items.map((item) => OrderItem(
          id: 'pending',
          orderId: 'pending',
          menuItemId: item['menuItemId'],
          name: item['name'],
          variantName: item['variantName'],
          quantity: item['quantity'],
          unitPrice: item['unitPrice'],
          totalPrice: item['unitPrice'] * item['quantity'],
          status: ItemStatus.pending,
          station: Station.fromString(item['station']),
          notes: item['notes'],
          createdAt: DateTime.now(),
        )).toList(),
        subtotal: items.fold(0.0, (sum, item) => 
          sum + (item['unitPrice'] * item['quantity'])),
        tax: 0.0,
        total: items.fold(0.0, (sum, item) => 
          sum + (item['unitPrice'] * item['quantity'])),
        notes: notes,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        isSynced: false,
      );
      
      await _offlineQueue.queueOrder(order);
      await _updatePendingCount();
      return;
    }
    
    try {
      final newOrder = await _api.createOrder(
        tableNumber: tableNumber,
        items: items,
        notes: notes,
      );
      
      state = state.copyWith(orders: [newOrder, ...state.orders]);
    } catch (e) {
      // If online but request failed, queue for retry
      rethrow;
    }
  }
  
  Future<void> updateOrderItem({
    required String orderId,
    required String itemId,
    int? quantity,
    String? notes,
  }) async {
    try {
      await _api.updateOrderItem(orderId, itemId, quantity: quantity, notes: notes);
      await loadOrders();
    } catch (e) {
      state = state.copyWith(error: 'خطا در به‌روزرسانی آیتم');
    }
  }
  
  Future<void> cancelOrderItem(String orderId, String itemId) async {
    try {
      await _api.cancelOrderItem(orderId, itemId);
      await loadOrders();
    } catch (e) {
      state = state.copyWith(error: 'خطا در لغو آیتم');
    }
  }
  
  void handleWebSocketEvent(WebSocketEvent event) {
    switch (event.type) {
      case 'order_created':
        final order = Order.fromJson(event.payload);
        state = state.copyWith(orders: [order, ...state.orders]);
        break;
        
      case 'item_status_changed':
        _updateItemInOrders(
          event.payload['orderId'],
          event.payload['itemId'],
          ItemStatus.fromString(event.payload['status']),
        );
        break;
        
      case 'order_status_changed':
        _updateOrderStatus(
          event.payload['orderId'],
          OrderStatus.fromString(event.payload['status']),
        );
        break;
    }
  }
  
  void _updateItemInOrders(String orderId, String itemId, ItemStatus newStatus) {
    final updatedOrders = state.orders.map((order) {
      if (order.id != orderId) return order;
      
      final updatedItems = order.items.map((item) {
        if (item.id != itemId) return item;
        return item.copyWith(status: newStatus);
      }).toList();
      
      return order.copyWith(items: updatedItems);
    }).toList();
    
    state = state.copyWith(orders: updatedOrders);
  }
  
  void _updateOrderStatus(String orderId, OrderStatus newStatus) {
    final updatedOrders = state.orders.map((order) {
      if (order.id != orderId) return order;
      return order.copyWith(status: newStatus);
    }).toList();
    
    state = state.copyWith(orders: updatedOrders);
  }
  
  Future<void> _updatePendingCount() async {
    final count = await _offlineQueue.getPendingOrdersCount();
    state = state.copyWith(pendingOfflineOrders: count);
  }
}

final ordersProvider = StateNotifierProvider<OrdersNotifier, OrdersState>((ref) {
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

final menuProvider = FutureProvider<List<MenuItem>>((ref) async {
  final api = ref.watch(apiServiceProvider);
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
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    if (_formKey.currentState!.validate()) {
      ref.read(authProvider.notifier).login(
        _phoneController.text.trim(),
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
      backgroundColor: AppTheme.backgroundWarm,
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
                      color: AppTheme.inkDark,
                    ),
                  ),
                  
                  const SizedBox(height: 8),
                  
                  Text(
                    'پنل پیشخدمت',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      color: AppTheme.textMuted,
                    ),
                  ),
                  
                  const SizedBox(height: 48),
                  
                  // Phone number field
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    textDirection: TextDirection.ltr,
                    decoration: InputDecoration(
                      labelText: 'شماره موبایل',
                      hintText: '09123456789',
                      prefixIcon: const Icon(Icons.phone),
                      filled: true,
                      fillColor: AppTheme.surfaceWhite,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.borderWarm),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.borderWarm),
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
                        return 'لطفاً شماره موبایل را وارد کنید';
                      }
                      if (!RegExp(r'^09\d{9}$').hasMatch(value)) {
                        return 'شماره موبایل معتبر نیست';
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
                        borderSide: BorderSide(color: AppTheme.borderWarm),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppTheme.borderWarm),
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
    final statusMap = [
      null, // All
      OrderStatus.pending,
      OrderStatus.preparing,
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
      backgroundColor: AppTheme.backgroundWarm,
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
                color: AppTheme.inkDark,
              ),
            ),
            Text(
              authState.session?.venueName ?? '',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.textMuted,
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
          unselectedLabelColor: AppTheme.textMuted,
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
                              color: AppTheme.textMuted,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              ordersState.error!,
                              style: TextStyle(color: AppTheme.textMuted),
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
                                  color: AppTheme.textMuted,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'سفارشی وجود ندارد',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: AppTheme.textMuted,
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
          name: menuItem.name,
          variantId: variantId,
          variantName: variantName,
          unitPrice: variantName != null
              ? menuItem.variants!
                  .firstWhere((v) => v['id'] == variantId)['price']
              : menuItem.price,
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
      'variantId': item.variantId,
      'quantity': item.quantity,
      'notes': null,
      'name': item.name,
      'variantName': item.variantName,
      'unitPrice': item.unitPrice,
      'station': item.station.value,
    }).toList();

    try {
      await ref.read(ordersProvider.notifier).createOrder(
        tableNumber: int.parse(_tableController.text),
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
      backgroundColor: AppTheme.backgroundWarm,
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceWhite,
        elevation: 0,
        title: Text(
          'سفارش جدید',
          style: TextStyle(
            fontFamily: 'DMSerifDisplay',
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: AppTheme.inkDark,
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
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'شماره میز',
                      prefixIcon: const Icon(Icons.table_restaurant),
                      filled: true,
                      fillColor: AppTheme.backgroundWarm,
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
                  label: station.persianName,
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
                      color: AppTheme.inkDark,
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
        backgroundColor: AppTheme.backgroundWarm,
        selectedColor: AppTheme.amberTint,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.accentAmber : AppTheme.textMuted,
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
  final double unitPrice;
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
    double? unitPrice,
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

class OrderCard extends StatelessWidget {
  final Order order;
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
        side: BorderSide(color: AppTheme.borderWarm, width: 1),
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
                          'میز ${order.tableNumber}',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: AppTheme.inkDark,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '#${order.id.substring(0, 8)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.textMuted,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  StatusBadge(status: order.status),
                ],
              ),

              const SizedBox(height: 12),

              // Items preview
              ...order.items.take(3).map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Icon(
                      Icons.circle,
                      size: 6,
                      color: AppTheme.textMuted,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.variantName != null
                            ? '${item.name} (${item.variantName})'
                            : item.name,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.inkDark,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '×${item.quantity}',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.accentAmber,
                      ),
                    ),
                  ],
                ),
              )),

              // More items indicator
              if (order.items.length > 3)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '+ ${order.items.length - 3} آیتم دیگر',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textMuted,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
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
                        color: AppTheme.textMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        order.waiterName ?? 'نامشخص',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.textMuted,
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
                        color: AppTheme.textMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatTime(order.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.textMuted,
                        ),
                      ),
                    ],
                  ),

                  // Total price
                  Text(
                    '${_formatPrice(order.totalAmount)} تومان',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.inkDark,
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

  String _formatPrice(double price) {
    // Format with thousands separator
    final formatted = price.toInt().toString().replaceAllMapped(
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

  static final _statusConfig = {
    OrderStatus.pending: _StatusConfig(
      label: 'در انتظار',
      backgroundColor: const Color(0xFFFFF8E1),
      borderColor: const Color(0xFFFFE082),
      dotColor: const Color(0xFFFFC107),
      textColor: const Color(0xFF795548),
    ),
    OrderStatus.preparing: _StatusConfig(
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

class MenuItemCard extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppTheme.borderWarm, width: 1),
      ),
      color: AppTheme.surfaceWhite,
      child: InkWell(
        onTap: () {
          if (menuItem.variants != null && menuItem.variants!.isNotEmpty) {
            _showVariantSheet(context);
          } else {
            onAdd(menuItem);
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Item image
            Expanded(
              flex: 3,
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
                child: menuItem.imageUrl != null
                    ? Image.network(
                        menuItem.imageUrl!,
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
                    // Name
                    Text(
                      menuItem.name,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppTheme.inkDark,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Price row + add button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Price
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (menuItem.variants != null &&
                                menuItem.variants!.isNotEmpty)
                              Text(
                                'از',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.textMuted,
                                ),
                              ),
                            Text(
                              _formatPrice(menuItem.price),
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
                          onTap: () {
                            if (menuItem.variants != null &&
                                menuItem.variants!.isNotEmpty) {
                              _showVariantSheet(context);
                            } else {
                              onAdd(menuItem);
                            }
                          },
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

            // Station tag
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 4),
              decoration: BoxDecoration(
                color: _stationColor(menuItem.station),
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(16),
                ),
              ),
              child: Text(
                menuItem.station.persianName,
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

  void _showVariantSheet(BuildContext context) {
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
                menuItem.name,
                style: TextStyle(
                  fontFamily: 'DMSerifDisplay',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.inkDark,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'یک گزینه انتخاب کنید',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textMuted,
                ),
              ),
              const SizedBox(height: 16),
              ...menuItem.variants!.map((variant) {
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(variant['name'] as String),
                  trailing: Text(
                    _formatPrice((variant['price'] as num).toDouble()),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppTheme.accentAmber,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    onAdd(
                      menuItem,
                      variantId: variant['id'] as String,
                      variantName: variant['name'] as String,
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

  String _formatPrice(double price) {
    final formatted = price.toInt().toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
    return '$formatted تومان';
  }

  Color _stationColor(Station station) {
    return switch (station) {
      Station.kitchen => const Color(0xFFE53935),
      Station.bar => const Color(0xFF8E24AA),
      Station.dessert => const Color(0xFFF4511E),
      Station.grill => const Color(0xFF6D4C41),
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
        color: AppTheme.textMuted,
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
    final liveOrder = ref.watch(ordersProvider).orders.firstWhere(
      (o) => o.id == order.id,
      orElse: () => order,
    );

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
                  color: AppTheme.borderWarm,
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
                          'میز ${liveOrder.tableNumber}',
                          style: TextStyle(
                            fontFamily: 'DMSerifDisplay',
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.inkDark,
                          ),
                        ),
                        Text(
                          '#${liveOrder.id.substring(0, 8)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.textMuted,
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
                                  color: AppTheme.inkDark,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Total
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'مجموع',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.inkDark,
                          ),
                        ),
                        Text(
                          '${_formatPrice(liveOrder.totalAmount)} تومان',
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
              if (liveOrder.status != OrderStatus.cancelled &&
                  liveOrder.status != OrderStatus.delivered)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Row(
                    children: [
                      // Mark as delivered
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            ref.read(ordersProvider.notifier).updateOrderStatus(
                              liveOrder.id,
                              OrderStatus.delivered,
                            );
                            Navigator.pop(context);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4CAF50),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'تحویل داده شد',
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
              ref.read(ordersProvider.notifier).updateOrderStatus(
                order.id,
                OrderStatus.cancelled,
              );
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

  String _formatPrice(double price) {
    return price.toInt().toString().replaceAllMapped(
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
              : AppTheme.backgroundWarm,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isCancelled
                ? const Color(0xFFEF9A9A)
                : AppTheme.borderWarm,
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
                        ? '${item.name} — ${item.variantName}'
                        : item.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppTheme.inkDark,
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
                        color: AppTheme.textMuted,
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
                  color: AppTheme.inkDark,
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
        content: Text('آیا "${item.name}" حذف شود؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('خیر'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(ordersProvider.notifier).cancelItem(
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
```

### **test/models/order_test.dart**
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:waiter_app/models/order.dart';

void main() {
  group('Order model', () {
    final sampleJson = {
      'id': 'abc-123',
      'venueId': 'venue-1',
      'waiterId': 'waiter-1',
      'waiterName': 'علی',
      'tableNumber': 5,
      'status': 'PENDING',
      'items': [
        {
          'id': 'item-1',
          'menuItemId': 'menu-1',
          'name': 'چای',
          'variantId': null,
          'variantName': null,
          'quantity': 2,
          'unitPrice': 15000.0,
          'totalPrice': 30000.0,
          'status': 'PENDING',
          'station': 'BAR',
          'notes': null,
        }
      ],
      'totalAmount': 30000.0,
      'notes': null,
      'createdAt': '2026-06-27T10:00:00.000Z',
      'updatedAt': '2026-06-27T10:00:00.000Z',
    };

    test('fromJson parses correctly', () {
      final order = Order.fromJson(sampleJson);

      expect(order.id, 'abc-123');
      expect(order.tableNumber, 5);
      expect(order.status, OrderStatus.pending);
      expect(order.items.length, 1);
      expect(order.items.first.quantity, 2);
      expect(order.totalAmount, 30000.0);
    });

    test('toJson round-trips correctly', () {
      final order = Order.fromJson(sampleJson);
      final json = order.toJson();

      expect(json['id'], 'abc-123');
      expect(json['status'], 'PENDING');
      expect((json['items'] as List).length, 1);
    });

    test('copyWith preserves unchanged fields', () {
      final order = Order.fromJson(sampleJson);
      final updated = order.copyWith(status: OrderStatus.preparing);

      expect(updated.status, OrderStatus.preparing);
      expect(updated.tableNumber, order.tableNumber);
      expect(updated.items, order.items);
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

  final sampleOrder = Order(
    id: 'order-1',
    venueId: 'venue-1',
    waiterId: 'waiter-1',
    waiterName: 'علی',
    tableNumber: 3,
    status: OrderStatus.pending,
    items: [],
    totalAmount: 0,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
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
      expect(state.orders, isEmpty);
      expect(state.isLoading, false);
    });

    test('fetchOrders populates state on success', () async {
      when(() => mockApi.getOrders()).thenAnswer(
        (_) async => [sampleOrder],
      );

      await container.read(ordersProvider.notifier).fetchOrders();
      final state = container.read(ordersProvider);

      expect(state.orders.length, 1);
      expect(state.orders.first.id, 'order-1');
      expect(state.isLoading, false);
      expect(state.error, isNull);
    });

    test('fetchOrders sets error on failure', () async {
      when(() => mockApi.getOrders()).thenThrow(Exception('Network error'));

      await container.read(ordersProvider.notifier).fetchOrders();
      final state = container.read(ordersProvider);

      expect(state.orders, isEmpty);
      expect(state.error, isNotNull);
    });

    test('WebSocket order_created event adds order to state', () async {
      // Arrange: seed with empty orders
      when(() => mockApi.getOrders()).thenAnswer((_) async => []);

      // Simulate WS event after initial fetch
      final wsController = StreamController<WebSocketEvent>();
      when(() => mockWs.events).thenAnswer((_) => wsController.stream);

      final freshContainer = createTestContainer(
        apiService: mockApi,
        wsService: mockWs,
      );

      await freshContainer.read(ordersProvider.notifier).fetchOrders();

      // Act: push WS event
      wsController.add(WebSocketEvent(
        type: 'order_created',
        payload: sampleOrder.toJson(),
      ));

      await Future.delayed(const Duration(milliseconds: 50));

      final state = freshContainer.read(ordersProvider);
      expect(state.orders.length, 1);
      expect(state.orders.first.id, 'order-1');

      await wsController.close();
      freshContainer.dispose();
    });

    test('updateOrderStatus sends request and updates local state', () async {
      when(() => mockApi.getOrders()).thenAnswer((_) async => [sampleOrder]);
      when(() => mockApi.updateOrderStatus('order-1', OrderStatus.delivered))
          .thenAnswer((_) async => sampleOrder.copyWith(
                status: OrderStatus.delivered,
              ));

      await container.read(ordersProvider.notifier).fetchOrders();
      await container.read(ordersProvider.notifier).updateOrderStatus(
            'order-1',
            OrderStatus.delivered,
          );

      final state = container.read(ordersProvider);
      expect(state.orders.first.status, OrderStatus.delivered);
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

void main() {
  late MockDio mockDio;
  late ApiService apiService;

  setUp(() {
    mockDio = MockDio();
    apiService = ApiService(dio: mockDio);
  });

  group('ApiService.getOrders', () {
    test('returns list of orders on 200', () async {
      when(() => mockDio.get(
            '/api/orders',
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => Response(
            requestOptions: RequestOptions(path: '/api/orders'),
            statusCode: 200,
            data: {
              'orders': [
                {
                  'id': 'order-1',
                  'venueId': 'venue-1',
                  'waiterId': 'waiter-1',
                  'waiterName': 'علی',
                  'tableNumber': 3,
                  'status': 'PENDING',
                  'items': [],
                  'totalAmount': 0.0,
                  'notes': null,
                  'createdAt': '2026-06-27T10:00:00.000Z',
                  'updatedAt': '2026-06-27T10:00:00.000Z',
                }
              ]
            },
          ));

      final orders = await apiService.getOrders();

      expect(orders.length, 1);
      expect(orders.first.id, 'order-1');
      expect(orders.first.status, OrderStatus.pending);
    });

    test('throws on non-200 response', () async {
      when(() => mockDio.get(
            '/api/orders',
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => Response(
            requestOptions: RequestOptions(path: '/api/orders'),
            statusCode: 401,
            data: {'error': 'Unauthorized'},
          ));

      expect(() => apiService.getOrders(), throwsException);
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
  final sampleOrder = Order(
    id: 'abc-123-def-456',
    venueId: 'venue-1',
    waiterId: 'waiter-1',
    waiterName: 'علی',
    tableNumber: 7,
    status: OrderStatus.preparing,
    items: [
      OrderItem(
        id: 'item-1',
        menuItemId: 'menu-1',
        name: 'قهوه اسپرسو',
        quantity: 2,
        unitPrice: 45000,
        totalPrice: 90000,
        status: ItemStatus.preparing,
        station: Station.bar,
      ),
    ],
    totalAmount: 90000,
    createdAt: DateTime(2026, 6, 27, 10, 30),
    updatedAt: DateTime(2026, 6, 27, 10, 30),
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

  testWidgets('displays item name', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: OrderCard(order: sampleOrder),
        ),
      ),
    );

    expect(find.text('قهوه اسپرسو'), findsOneWidget);
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

    expect(find.text('در حال آماده‌سازی'), findsOneWidget);
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

