import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/dashboard_overview.dart';
import '../../widgets/loading_shimmer.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      body: SafeArea(
        child: dashAsync.when(
          loading: () => const LoadingShimmer(itemCount: 6),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.wifi_off, size: 48, color: AppTheme.textMuted),
              const SizedBox(height: 12),
              Text(e.toString(), style: const TextStyle(color: AppTheme.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(dashboardProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ]),
          ),
          data: (overview) => _buildBody(context, ref, overview),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, DashboardOverview overview) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(dashboardProvider),
      color: AppTheme.primary,
      backgroundColor: AppTheme.bgCard,
      child: CustomScrollView(
        slivers: [
          _buildAppBar(ref),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 16),
                  _buildSearchBar(context).animate().fade().slideY(begin: 0.2, duration: 400.ms),
                  const SizedBox(height: 24),
                  
                  // Promo Banner
                  _buildPromoBanner(context).animate().fade(delay: 100.ms).scale(duration: 400.ms),
                  const SizedBox(height: 24),

                  // Main Categories (Like "Games By Sports")
                  const Text('QUICK ACCESS', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.2)).animate().fade(delay: 200.ms),
                  const SizedBox(height: 16),
                  _buildCategories(context, overview).animate().fade(delay: 250.ms).slideY(begin: 0.1),
                  const SizedBox(height: 32),

                  // Upcoming Events (Like "Pay at Favourite Venues")
                  if (overview.upcomingEvents.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('UPCOMING EVENTS', style: TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
                        GestureDetector(
                          onTap: () => context.push('/events'),
                          child: const Text('View All', style: TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ).animate().fade(delay: 300.ms),
                    const SizedBox(height: 16),
                    _buildEventsList(context, overview.upcomingEvents).animate().fade(delay: 350.ms),
                    const SizedBox(height: 32),
                  ],

                  // Action Cards (Like "Play. Refer. Earn.")
                  _buildActionCards(context).animate().fade(delay: 400.ms).slideY(begin: 0.1),
                  const SizedBox(height: 24),
                  
                  // Club Stats Banner
                  _buildStatsBanner(overview).animate().fade(delay: 450.ms),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar(WidgetRef ref) {
    return SliverAppBar(
      backgroundColor: AppTheme.bgLight,
      pinned: true,
      elevation: 0,
      scrolledUnderElevation: 2,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppTheme.primaryLight,
            child: const Icon(Icons.person_outline, color: AppTheme.primary),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FutureBuilder<String>(
                future: Session.getUserName(),
                builder: (_, snap) => Text(
                  'Hey ${snap.data ?? 'Admin'}!',
                  style: const TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.w800),
                ),
              ),
              FutureBuilder<String>(
                future: Session.getClubName(),
                builder: (_, snap) => Row(
                  children: [
                    Text(
                      snap.data ?? 'Mukijo Club',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                    const Icon(Icons.keyboard_arrow_down, color: AppTheme.textSecondary, size: 16),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.chat_bubble_outline, color: AppTheme.textPrimary),
          onPressed: () {},
        ),
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: AppTheme.textPrimary),
          onPressed: () {},
        ),
        PopupMenuButton(
          icon: const Icon(Icons.menu, color: AppTheme.textPrimary),
          color: AppTheme.bgCard,
          itemBuilder: (context) => [
             PopupMenuItem(
              onTap: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
              child: const Row(
                children: [
                  Icon(Icons.logout, color: AppTheme.error, size: 20),
                  SizedBox(width: 8),
                  Text('Logout', style: TextStyle(color: AppTheme.error)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.softShadow,
      ),
      child: Row(
        children: [
          const Icon(Icons.search, color: AppTheme.textMuted, size: 22),
          const SizedBox(width: 12),
          const Text('Search for events, groups...', style: TextStyle(color: AppTheme.textMuted, fontSize: 15)),
        ],
      ),
    );
  }

  Widget _buildPromoBanner(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.softShadow,
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: AppTheme.accent, borderRadius: BorderRadius.circular(6)),
                child: const Text('PRO TIP', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 12),
              const Text('Manage Your Club\nLike a Pro.', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, height: 1.2)),
              const SizedBox(height: 16),
              const Text('Add members, create events & track payments easily.', style: TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
          Positioned(
            right: 0,
            bottom: 0,
            child: Icon(Icons.rocket_launch, color: Colors.white.withValues(alpha: 0.1), size: 100),
          ),
        ],
      ),
    );
  }

  Widget _buildCategories(BuildContext context, DashboardOverview overview) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE5F7ED), Color(0xFFFFFFFF)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.softShadow,
      ),
      child: Wrap(
        spacing: 20,
        runSpacing: 24,
        alignment: WrapAlignment.spaceEvenly,
        children: [
          _CategoryItem(icon: Icons.group, label: 'Groups', color: AppTheme.primary, badge: overview.totalGroups.toString(), onTap: () => context.push('/groups')),
          _CategoryItem(icon: Icons.event, label: 'Events', color: AppTheme.info, badge: overview.upcomingEventsCount.toString(), onTap: () => context.push('/events')),
          _CategoryItem(icon: Icons.school, label: 'Courses', color: AppTheme.warning, onTap: () => context.push('/courses')),
          _CategoryItem(icon: Icons.payment, label: 'Payments', color: AppTheme.error, onTap: () => context.push('/payments')),
          _CategoryItem(icon: Icons.people, label: 'Members', color: Colors.purple, badge: overview.totalMembers.toString(), onTap: () => context.push('/members')),
          _CategoryItem(icon: Icons.volunteer_activism, label: 'Funds', color: Colors.teal, onTap: () => context.push('/fundraising')),
        ],
      ),
    );
  }

  Widget _buildEventsList(BuildContext context, List<UpcomingEvent> events) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      clipBehavior: Clip.none,
      child: Row(
        children: events.map((e) => Container(
          width: 260,
          margin: const EdgeInsets.only(right: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.bgCard,
            borderRadius: BorderRadius.circular(20),
            boxShadow: AppTheme.softShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: AppTheme.primaryLight, borderRadius: BorderRadius.circular(8)),
                child: Text(e.type, style: const TextStyle(color: AppTheme.primaryDark, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(height: 12),
              Text(e.name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.calendar_today, color: AppTheme.textMuted, size: 14),
                  const SizedBox(width: 6),
                  Text(e.date ?? 'Date TBD', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on, color: AppTheme.textMuted, size: 14),
                  const SizedBox(width: 6),
                  Expanded(child: Text(e.location ?? 'TBD', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis)),
                ],
              ),
            ],
          ),
        )).toList(),
      ),
    );
  }

  Widget _buildActionCards(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: AppTheme.greenGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: AppTheme.softShadow,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Host.\nPlay.\nRepeat.', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, height: 1.2)),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                  child: const Text('Add Event', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: AppTheme.blueGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: AppTheme.softShadow,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Find Your\nSquad.\nWin.', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, height: 1.2)),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                  child: const Text('Add Member', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatsBanner(DashboardOverview overview) {
    final currency = NumberFormat('#,##0', 'en_IN');
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.softShadow,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppTheme.error.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: const Icon(Icons.account_balance_wallet, color: AppTheme.error, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Pending Dues', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                Text('₹${currency.format(overview.pendingPayments)}', style: const TextStyle(color: AppTheme.error, fontSize: 22, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final String? badge;
  final VoidCallback onTap;

  const _CategoryItem({required this.icon, required this.label, required this.color, this.badge, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.2), width: 2),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              if (badge != null && badge != '0')
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                    child: Text(badge!, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
