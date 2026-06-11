import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/app_theme.dart';
import '../../providers/events_provider.dart';
import '../../models/event.dart';
import '../../widgets/loading_shimmer.dart';

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventsProvider);

    return Scaffold(
      backgroundColor:n   AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('Club Events'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {},
          ),
        ],
      ),
      body: eventsAsync.when(
        loading: () => const LoadingShimmer(itemCount: 5),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
            const SizedBox(height: 12),
            Text('Failed to load events', style: const TextStyle(color: AppTheme.textSecondary)),
            TextButton(onPressed: () => ref.invalidate(eventsProvider), child: const Text('Retry')),
          ]),
        ),
        data: (events) => _buildBody(context, ref, events),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/events/add'),
        icon: const Icon(Icons.add),
        label: const Text('Create Event'),
      ),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, List<Event> events) {
    if (events.isEmpty) {
      return const Center(child: Text('No events found.', style: TextStyle(color: AppTheme.textSecondary)));
    }

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(eventsProvider),
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 16, left: 16, right: 16, bottom: 80),
        itemCount: events.length,
        itemBuilder: (context, index) {
          final event = events[index];
          return _EventCard(event: event)
              .animate()
              .fade(delay: (50 * index).ms)
              .slideX(begin: 0.1);
        },
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
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppTheme.softShadow,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.event, color: AppTheme.primary, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, color: AppTheme.textMuted, size: 14),
                      const SizedBox(width: 6),
                      Text('${event.date ?? "TBD"} • ${event.time ?? ""}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, color: AppTheme.textMuted, size: 14),
                      const SizedBox(width: 6),
                      Expanded(child: Text(event.location ?? 'Location TBA', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: event.fee > 0 ? AppTheme.warning.withValues(alpha: 0.1) : AppTheme.success.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    event.fee > 0 ? '₹${event.fee}' : 'FREE',
                    style: TextStyle(
                      color: event.fee > 0 ? AppTheme.warning : AppTheme.success,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Icon(Icons.chevron_right, color: AppTheme.textMuted),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
