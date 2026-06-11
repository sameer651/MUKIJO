import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/app_theme.dart';
import '../../providers/groups_provider.dart';
import '../../models/group.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_shimmer.dart';

class GroupsScreen extends ConsumerWidget {
  const GroupsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupsAsync = ref.watch(groupsProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('Groups & Teams'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {},
          ),
        ],
      ),
      body: groupsAsync.when(
        loading: () => const LoadingShimmer(itemCount: 5),
        error: (e, _) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
            const SizedBox(height: 12),
            Text('Failed to load groups', style: const TextStyle(color: AppTheme.textSecondary)),
            TextButton(onPressed: () => ref.invalidate(groupsProvider), child: const Text('Retry')),
          ]),
        ),
        data: (groups) {
          if (groups.isEmpty) {
            return EmptyState(
              icon: Icons.group_work_outlined,
              title: 'No groups yet',
              subtitle: 'Create your first team or group to get started',
              actionLabel: 'Create Group',
              onAction: () => context.push('/groups/add'),
            ).animate().fade().scale();
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(groupsProvider),
            color: AppTheme.primary,
            backgroundColor: AppTheme.bgCard,
            child: ListView.builder(
              padding: const EdgeInsets.only(top: 16, left: 16, right: 16, bottom: 80),
              itemCount: groups.length,
              itemBuilder: (context, index) {
                return _GroupCard(group: groups[index])
                    .animate()
                    .fade(delay: (50 * index).ms)
                    .slideX(begin: 0.1);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/groups/add'),
        icon: const Icon(Icons.add),
        label: const Text('New Group'),
      ),
    );
  }
}

class _GroupCard extends StatelessWidget {
  final Group group;
  const _GroupCard({required this.group});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/groups/${group.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppTheme.softShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  group.groupName.isNotEmpty ? group.groupName[0].toUpperCase() : 'G',
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    group.groupName,
                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _Tag(group.activity, AppTheme.primary),
                      _Tag(group.ageGroup, AppTheme.info),
                      if (group.subGroup != null && group.subGroup!.isNotEmpty)
                        _Tag(group.subGroup!, AppTheme.warning),
                    ],
                  ),
                  if (group.description != null && group.description!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      group.description!,
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: AppTheme.textMuted),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color color;
  const _Tag(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }
}
