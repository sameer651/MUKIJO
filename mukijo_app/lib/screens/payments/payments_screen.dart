import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/app_theme.dart';
import '../../providers/payments_provider.dart';
import '../../models/payment.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/status_chip.dart';

class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _statuses = ['All', 'Pending', 'Paid', 'Overdue'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statuses.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Payment> _filter(List<Payment> payments, String tab) {
    if (tab == 'All') return payments;
    return payments.where((p) => p.status.toLowerCase() == tab.toLowerCase()).toList();
  }

  Future<void> _markPaid(Payment payment) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        title: const Text('Mark as Paid', style: TextStyle(color: AppTheme.textPrimary)),
        content: Text('Mark "${payment.title}" as paid?', style: const TextStyle(color: AppTheme.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Mark Paid')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ref.read(paymentsNotifierProvider.notifier).markAsPaid(payment.id);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment marked as paid!'), backgroundColor: AppTheme.success));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final paymentsAsync = ref.watch(allPaymentsProvider);
    final summaryAsync = ref.watch(paymentsSummaryProvider);
    final currency = NumberFormat('#,##0', 'en_IN');

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('Payments & Dues'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: _statuses.map((s) => Tab(text: s)).toList(),
        ),
      ),
      body: Column(
        children: [
          // Summary
          summaryAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (s) => Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(children: [
                    Expanded(child: _SummaryCard('Collected', '₹${currency.format(s['total_collected'] ?? 0)}', AppTheme.success, Icons.check_circle_outline)),
                    const SizedBox(width: 12),
                    Expanded(child: _SummaryCard('Pending', '₹${currency.format(s['pending_amount'] ?? 0)}', AppTheme.warning, Icons.access_time)),
                  ]),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: _SummaryCard('Overdue', '₹${currency.format(s['overdue_amount'] ?? 0)}', AppTheme.error, Icons.warning_amber_outlined)),
                    const SizedBox(width: 12),
                    Expanded(child: _SummaryCard('Total', '${s['total_requests'] ?? 0} requests', AppTheme.info, Icons.receipt_long_outlined)),
                  ]),
                ],
              ),
            ),
          ).animate().fade(),
          Expanded(
            child: paymentsAsync.when(
              loading: () => const LoadingShimmer(itemCount: 4),
              error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.error))),
              data: (payments) => TabBarView(
                controller: _tabController,
                children: _statuses.map((tab) {
                  final filtered = _filter(payments, tab);
                  if (filtered.isEmpty) {
                    return EmptyState(
                      icon: Icons.receipt_outlined,
                      title: 'No ${tab.toLowerCase()} payments',
                      subtitle: 'Add payment requests for members or groups',
                      actionLabel: tab == 'All' ? 'Add Payment' : null,
                      onAction: tab == 'All' ? () => context.push('/payments/add') : null,
                    ).animate().fade().scale();
                  }
                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(allPaymentsProvider);
                      ref.invalidate(paymentsSummaryProvider);
                    },
                    color: AppTheme.primary,
                    backgroundColor: AppTheme.bgCard,
                    child: ListView.builder(
                      padding: const EdgeInsets.only(top: 8, left: 16, right: 16, bottom: 80),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        return _PaymentCard(payment: filtered[index], onMarkPaid: () => _markPaid(filtered[index]))
                            .animate()
                            .fade(delay: (50 * index).ms)
                            .slideY(begin: 0.1);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/payments/add'),
        icon: const Icon(Icons.add),
        label: const Text('Add Payment'),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  const _SummaryCard(this.label, this.value, this.color, this.icon);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(20), boxShadow: AppTheme.softShadow),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.all(10), 
            decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)), 
            child: Icon(icon, color: color, size: 24)
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
            Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
          ])),
        ]),
      );
}

class _PaymentCard extends StatelessWidget {
  final Payment payment;
  final VoidCallback onMarkPaid;
  const _PaymentCard({required this.payment, required this.onMarkPaid});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.statusColor(payment.status);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(20), boxShadow: AppTheme.softShadow),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.15), shape: BoxShape.circle),
            child: Center(child: Icon(Icons.attach_money, color: color, size: 24)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(payment.title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Text(payment.memberName ?? payment.groupName ?? 'Club-wide', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              if (payment.dueDate != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Due: ${payment.dueDate}', style: TextStyle(color: payment.status == 'overdue' ? AppTheme.error : AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w500)),
                ),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('₹${payment.amount}', style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            StatusChip(status: payment.status),
            if (payment.status == 'pending' || payment.status == 'overdue') ...[
              const SizedBox(height: 8),
              GestureDetector(
                onTap: onMarkPaid,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: AppTheme.success.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: const Text('Mark Paid', style: TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ]),
        ],
      ),
    );
  }
}
