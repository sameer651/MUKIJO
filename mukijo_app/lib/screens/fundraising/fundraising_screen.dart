import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/app_theme.dart';
import '../../providers/fundraising_provider.dart';
import '../../models/fundraising_campaign.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/status_chip.dart';

class FundraisingScreen extends ConsumerWidget {
  const FundraisingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final campaignsAsync = ref.watch(fundraisingProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('Fundraising'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
      ),
      body: campaignsAsync.when(
        loading: () => const LoadingShimmer(itemCount: 3),
        error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.error))),
        data: (campaigns) {
          final totalRaised = campaigns.fold<int>(0, (sum, c) => sum + c.raised);
          final totalGoal = campaigns.fold<int>(0, (sum, c) => sum + c.goal);

          if (campaigns.isEmpty) {
            return EmptyState(
              icon: Icons.volunteer_activism_outlined,
              title: 'No campaigns yet',
              subtitle: 'Start your first fundraising campaign',
              actionLabel: 'Create Campaign',
              onAction: () => context.push('/fundraising/add'),
            ).animate().fade().scale();
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(fundraisingProvider),
            color: AppTheme.primary,
            backgroundColor: AppTheme.bgCard,
            child: ListView(
              padding: const EdgeInsets.only(top: 16, left: 16, right: 16, bottom: 80),
              children: [
                // Summary
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: AppTheme.greenGradient, 
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [BoxShadow(color: AppTheme.success.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Total Raised', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text('₹$totalRaised', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: totalGoal > 0 ? (totalRaised / totalGoal).clamp(0.0, 1.0) : 0,
                        backgroundColor: Colors.white.withValues(alpha: 0.3),
                        valueColor: const AlwaysStoppedAnimation(Colors.white),
                        minHeight: 8,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('of ₹$totalGoal goal across ${campaigns.length} campaigns', style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, fontWeight: FontWeight.w500)),
                  ]),
                ).animate().fade().slideY(begin: -0.1),
                const SizedBox(height: 24),
                ...List.generate(campaigns.length, (index) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _CampaignCard(campaign: campaigns[index], ref: ref)
                        .animate()
                        .fade(delay: (50 * index).ms)
                        .slideY(begin: 0.1),
                  );
                }),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/fundraising/add'),
        icon: const Icon(Icons.add),
        label: const Text('New Campaign'),
      ),
    );
  }
}

class _CampaignCard extends StatelessWidget {
  final FundraisingCampaign campaign;
  final WidgetRef ref;
  const _CampaignCard({required this.campaign, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(20), boxShadow: AppTheme.softShadow),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(12), 
            decoration: BoxDecoration(color: AppTheme.success.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)), 
            child: const Icon(Icons.volunteer_activism, color: AppTheme.success, size: 28)
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(campaign.title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 4),
            if (campaign.groupName != null) Text(campaign.groupName!, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
          ])),
          StatusChip(status: campaign.status),
        ]),
        const SizedBox(height: 16),
        if (campaign.description != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(campaign.description!, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
          ),
        // Progress
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('₹${campaign.raised} raised', style: const TextStyle(color: AppTheme.success, fontWeight: FontWeight.w800, fontSize: 18)),
          Text('of ₹${campaign.goal}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 14, fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: campaign.progressPercent,
            backgroundColor: AppTheme.surfaceLight,
            valueColor: const AlwaysStoppedAnimation(AppTheme.success),
            minHeight: 10,
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Text('${(campaign.progressPercent * 100).toStringAsFixed(1)}% funded', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w700)),
          const Spacer(),
          Text('${campaign.donorsCount} donors', style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
          if (campaign.deadline != null) ...[
            const SizedBox(width: 12),
            Text('Ends: ${campaign.deadline}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
          ],
        ]),
      ]),
    );
  }
}
