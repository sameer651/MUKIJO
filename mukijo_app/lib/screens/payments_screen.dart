import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../models/payment.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  final ApiClient _apiClient = ApiClient();
  late Future<List<Payment>> _futurePayments;

  @override
  void initState() {
    super.initState();
    _futurePayments = _fetchPayments();
  }

  Future<List<Payment>> _fetchPayments() async {
    final response = await _apiClient.get('/payments');
    return (response as List).map((json) => Payment.fromJson(json)).toList();
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return Colors.green;
      case 'overdue':
        return Colors.red;
      case 'cancelled':
        return Colors.grey;
      default:
        return Colors.orange; // pending
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payments & Dues'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: FutureBuilder<List<Payment>>(
        future: _futurePayments,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No payment records found.'));
          }

          final payments = snapshot.data!;
          return ListView.builder(
            itemCount: payments.length,
            padding: const EdgeInsets.all(8.0),
            itemBuilder: (context, index) {
              final payment = payments[index];
              return Card(
                elevation: 2,
                margin: const EdgeInsets.symmetric(vertical: 6),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getStatusColor(payment.status).withOpacity(0.2),
                    child: Icon(Icons.attach_money, color: _getStatusColor(payment.status)),
                  ),
                  title: Text(payment.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(payment.memberName ?? payment.groupName ?? 'General Fee'),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('₹${payment.amount}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      Text(payment.status.toUpperCase(), style: TextStyle(color: _getStatusColor(payment.status), fontSize: 12)),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
