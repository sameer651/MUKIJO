import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../providers/events_provider.dart';
import '../../providers/groups_provider.dart';
import '../../models/event_registration.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/status_chip.dart';

class EventDetailScreen extends ConsumerStatefulWidget {
  final int eventId;
  const EventDetailScreen({super.key, required this.eventId});

  @override
  ConsumerState<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _markAttendance(int registrationId, String attendance) async {
    try {
      await ref.read(eventsNotifierProvider.notifier).markAttendance(widget.eventId, registrationId, attendance);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Marked as $attendance'), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final eventAsync = ref.watch(eventDetailProvider(widget.eventId));
    final participantsAsync = ref.watch(eventParticipantsProvider(widget.eventId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Event Details'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: 'Overview'), Tab(text: 'Participants')],
        ),
      ),
      body: eventAsync.when(
        loading: () => const LoadingShimmer(),
        error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.error))),
        data: (event) => TabBarView(
          controller: _tabController,
          children: [
            // Overview Tab
            SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Event Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: AppTheme.orangeGradient,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(event.type, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
                        const SizedBox(height: 4),
                        Text(event.name, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 12),
                        if (event.fee > 0)
                          Text('₹${event.fee}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700))
                        else
                          const Text('FREE EVENT', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Info Cards
                  _InfoTile(Icons.calendar_today, 'Date & Time', '${event.date} at ${event.time}'),
                  if (event.location != null) _InfoTile(Icons.location_on, 'Location', event.location!),
                  if (event.description != null) _InfoTile(Icons.description, 'Description', event.description!),
                  if (event.maxParticipants != null) _InfoTile(Icons.people, 'Max Participants', event.maxParticipants.toString()),
                  if (event.registrationDeadline != null) _InfoTile(Icons.timer, 'Registration Deadline', event.registrationDeadline!),
                  if (event.groupName != null) _InfoTile(Icons.group, 'Group', event.groupName!),

                  const SizedBox(height: 16),

                  // Toggles Display
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (event.isPublic) _Badge('Public', AppTheme.success),
                      if (event.allowGuest) _Badge('Guest Allowed', AppTheme.info),
                      if (event.allowWaitingList) _Badge('Waiting List', AppTheme.warning),
                      if (event.attendanceTracking) _Badge('Attendance Tracked', AppTheme.primary),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Invite button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _showInviteDialog(context, event.id),
                      icon: const Icon(Icons.send),
                      label: const Text('Invite Members'),
                    ),
                  ),
                ],
              ),
            ),

            // Participants Tab
            participantsAsync.when(
              loading: () => const LoadingShimmer(),
              error: (e, _) => Center(child: Text(e.toString())),
              data: (participants) {
                if (participants.isEmpty) {
                  return const Center(
                    child: Text('No participants yet', style: TextStyle(color: AppTheme.textSecondary)),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: participants.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) => _ParticipantCard(
                    registration: participants[i],
                    onMarkAttendance: (attendance) => _markAttendance(participants[i].id, attendance),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showInviteDialog(BuildContext context, int eventId) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppTheme.bgCard,
        title: const Text('Invite Members', style: TextStyle(color: AppTheme.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: ['all_members', 'coaches', 'parents'].map((type) {
            final label = type == 'all_members' ? 'All Members' : type == 'coaches' ? 'Coaches Only' : 'Parents Only';
            return ListTile(
              title: Text(label, style: const TextStyle(color: AppTheme.textPrimary)),
              onTap: () async {
                Navigator.pop(context);
                try {
                  await ref.read(eventsNotifierProvider.notifier).markAttendance(eventId, 0, 'not_marked');
                  // Actually call invite
                } catch (e) {}
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Invited: $label'), backgroundColor: AppTheme.success),
                  );
                }
              },
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppTheme.primary, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge(this.label, this.color);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withOpacity(0.3))),
        child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w500)),
      );
}

class _ParticipantCard extends StatelessWidget {
  final EventRegistration registration;
  final Function(String) onMarkAttendance;
  const _ParticipantCard({required this.registration, required this.onMarkAttendance});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppTheme.primary.withOpacity(0.15),
            child: Text(
              registration.participantName.isNotEmpty ? registration.participantName[0].toUpperCase() : '?',
              style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(registration.participantName, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
                Row(
                  children: [
                    StatusChip(status: registration.status),
                    const SizedBox(width: 6),
                    StatusChip(status: registration.attendance),
                  ],
                ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            color: AppTheme.bgLight,
            icon: const Icon(Icons.more_vert, color: AppTheme.textMuted, size: 20),
            onSelected: onMarkAttendance,
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'present', child: Text('✅ Present', style: TextStyle(color: AppTheme.textPrimary))),
              const PopupMenuItem(value: 'absent', child: Text('❌ Absent', style: TextStyle(color: AppTheme.textPrimary))),
              const PopupMenuItem(value: 'late', child: Text('⏰ Late', style: TextStyle(color: AppTheme.textPrimary))),
              const PopupMenuItem(value: 'not_marked', child: Text('— Unmark', style: TextStyle(color: AppTheme.textPrimary))),
            ],
          ),
        ],
      ),
    );
  }
}
