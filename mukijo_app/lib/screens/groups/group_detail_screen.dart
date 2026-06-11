import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../providers/groups_provider.dart';
import '../../models/member.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/status_chip.dart';

class GroupDetailScreen extends ConsumerWidget {
  final int groupId;
  const GroupDetailScreen({super.key, required this.groupId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final membersAsync = ref.watch(groupMembersProvider(groupId));
    final groupsAsync = ref.watch(groupsProvider);

    final groupName = groupsAsync.maybeWhen(
      data: (groups) => groups.where((g) => g.id == groupId).firstOrNull?.groupName ?? 'Group',
      orElse: () => 'Group',
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(groupName),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_outlined),
            onPressed: () => context.push('/groups/$groupId/add-member'),
          ),
        ],
      ),
      body: membersAsync.when(
        loading: () => const LoadingShimmer(),
        error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.error))),
        data: (members) {
          if (members.isEmpty) {
            return EmptyState(
              icon: Icons.people_outline,
              title: 'No members yet',
              subtitle: 'Add members to this group to get started',
              actionLabel: 'Add Member',
              onAction: () => context.push('/groups/$groupId/add-member'),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(groupMembersProvider(groupId)),
            color: AppTheme.primary,
            backgroundColor: AppTheme.bgCard,
            child: Column(
              children: [
                // Summary bar
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.group, color: Colors.white),
                      const SizedBox(width: 8),
                      Text(
                        '${members.length} Members',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                      ),
                      const Spacer(),
                      Text(
                        '${members.where((m) => m.role.toLowerCase() == 'coach').length} Coaches',
                        style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: members.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => _MemberCard(
                      member: members[i],
                      onDelete: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (_) => AlertDialog(
                            backgroundColor: AppTheme.bgCard,
                            title: const Text('Remove Member', style: TextStyle(color: AppTheme.textPrimary)),
                            content: Text(
                              'Remove ${members[i].fullName} from this group?',
                              style: const TextStyle(color: AppTheme.textSecondary),
                            ),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                              TextButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Remove', style: TextStyle(color: AppTheme.error)),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true && context.mounted) {
                          // TODO: Delete member API
                          ref.invalidate(groupMembersProvider(groupId));
                        }
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/groups/$groupId/add-member'),
        icon: const Icon(Icons.person_add),
        label: const Text('Add Member'),
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  final Member member;
  final VoidCallback onDelete;
  const _MemberCard({required this.member, required this.onDelete});

  Color _roleColor(String role) {
    switch (role.toLowerCase()) {
      case 'coach': return AppTheme.success;
      case 'parent': return AppTheme.info;
      case 'player': return AppTheme.primary;
      case 'referee': return AppTheme.warning;
      default: return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: _roleColor(member.role).withOpacity(0.15),
            child: Text(
              member.firstName.isNotEmpty ? member.firstName[0].toUpperCase() : '?',
              style: TextStyle(color: _roleColor(member.role), fontWeight: FontWeight.w700, fontSize: 18),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      member.fullName,
                      style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: _roleColor(member.role).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        member.role,
                        style: TextStyle(color: _roleColor(member.role), fontSize: 10, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(member.email, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                if (member.phone.isNotEmpty)
                  Text(member.phone, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.more_vert, color: AppTheme.textMuted, size: 20),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}
