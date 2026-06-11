import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../providers/events_provider.dart';
import '../../models/event.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/status_chip.dart';

class EventsScreen extends ConsumerStatefulWidget {
  const EventsScreen({super.key});

  @override
  ConsumerState<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends ConsumerState<EventsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = ['All', 'Upcoming', 'Past'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Event> _filter(List<Event> events, String tab) {
    final today = DateTime.now();
    if (tab == 'Upcoming') {
      return events.where((e) {
        try { return DateTime.parse(e.date).isAfter(today) || DateTime.parse(e.date).isAtSameMomentAs(today); }
        catch (_) { return false; }
      }).toList();
    } else if (tab == 'Past') {
      return events.where((e) {
        try { return DateTime.parse(e.date).isBefore(today); }
        catch (_) { return false; }
      }).toList();
    }
    return events;
  }

  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(eventsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Events'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
        bottom: TabBar(
          controller: _tabController,
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: eventsAsync.when(
        loading: () => const LoadingShimmer(),
        error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.error))),
        data: (events) => TabBarView(
          controller: _tabController,
          children: _tabs.map((tab) {
            final filtered = _filter(events, tab);
            if (filtered.isEmpty) {
              return EmptyState(
                icon: Icons.event_outlined,
                title: 'No ${tab.toLowerCase()} events',
                subtitle: 'Create a new event to see it here',
                actionLabel: tab == 'All' ? 'Create Event' : null,
                onAction: tab == 'All' ? () => context.push('/events/add') : null,
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(eventsProvider),
              color: AppTheme.primary,
              backgroundColor: AppTheme.bgCard,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _EventCard(event: filtered[i]),
              ),
            );
          }).toList(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/events/add'),
        icon: const Icon(Icons.add),
        label: const Text('New Event'),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final Event event;
  const _EventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/events/${event.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.warning.withOpacity(0.3), AppTheme.warning.withOpacity(0.05)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.warning.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.event, color: AppTheme.warning, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(event.name, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(height: 3),
                        Text(event.type, style: const TextStyle(color: AppTheme.warning, fontSize: 12, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                  if (event.fee > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppTheme.success.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('₹${event.fee}', style: const TextStyle(color: AppTheme.success, fontWeight: FontWeight.w700, fontSize: 13)),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(color: AppTheme.success.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
                      child: const Text('FREE', style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                ],
              ),
            ),
            // Details
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _InfoRow(Icons.calendar_today_outlined, '${event.date} at ${event.time}', AppTheme.info),
                  if (event.location != null && event.location!.isNotEmpty)
                    _InfoRow(Icons.location_on_outlined, event.location!, AppTheme.primary),
                  if (event.groupName != null)
                    _InfoRow(Icons.group_outlined, event.groupName!, AppTheme.textSecondary),
                  if (event.maxParticipants != null)
                    _InfoRow(Icons.people_outline, 'Max ${event.maxParticipants} participants', AppTheme.textMuted),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _InfoRow(this.icon, this.text, this.color);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color.withOpacity(0.7)),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13), overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}
