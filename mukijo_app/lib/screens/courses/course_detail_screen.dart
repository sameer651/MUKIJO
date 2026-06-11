import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../providers/courses_provider.dart';
import '../../models/course_registration.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/status_chip.dart';

class CourseDetailScreen extends ConsumerWidget {
  final int courseId;
  const CourseDetailScreen({super.key, required this.courseId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final courseAsync = ref.watch(courseDetailProvider(courseId));
    final registrationsAsync = ref.watch(courseRegistrationsProvider(courseId));

    return Scaffold(
      appBar: AppBar(title: const Text('Course Details')),
      body: courseAsync.when(
        loading: () => const LoadingShimmer(),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (course) => CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppTheme.blueGradient,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(course.category, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(course.title, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
                    if (course.instructor != null) ...[
                      const SizedBox(height: 6),
                      Text('by ${course.instructor}', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
                    ],
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _Stat('Fee', course.fee > 0 ? '₹${course.fee}' : 'FREE'),
                        _Stat('Capacity', '${course.capacity}'),
                        _Stat('Enrolled', '${course.registrationCount}'),
                        _Stat('Available', '${course.availableSeats}'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  if (course.description != null) _InfoCard('Description', course.description!),
                  if (course.schedule != null) _InfoCard('Schedule', course.schedule!),
                  if (course.location != null) _InfoCard('Location', course.location!),
                  if (course.startDate != null) _InfoCard('Duration', '${course.startDate} → ${course.endDate ?? 'Ongoing'}'),
                  const SizedBox(height: 16),
                  Text('Registrations', style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                ]),
              ),
            ),
            registrationsAsync.when(
              loading: () => const SliverToBoxAdapter(child: LoadingShimmer(itemCount: 3)),
              error: (e, _) => SliverToBoxAdapter(child: Center(child: Text(e.toString()))),
              data: (regs) {
                if (regs.isEmpty) {
                  return const SliverToBoxAdapter(
                    child: Center(child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('No registrations yet', style: TextStyle(color: AppTheme.textSecondary)),
                    )),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _RegistrationCard(registration: regs[i]),
                      ),
                      childCount: regs.length,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  const _Stat(this.label, this.value);

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          children: [
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
            Text(label, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11)),
          ],
        ),
      );
}

class _InfoCard extends StatelessWidget {
  final String label;
  final String value;
  const _InfoCard(this.label, this.value);

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w500)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
          ],
        ),
      );
}

class _RegistrationCard extends StatelessWidget {
  final CourseRegistration registration;
  const _RegistrationCard({required this.registration});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
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
                  Text(registration.participantName, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                  if (registration.participantEmail != null)
                    Text(registration.participantEmail!, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                StatusChip(status: registration.status),
                const SizedBox(height: 4),
                StatusChip(status: registration.paymentStatus),
              ],
            ),
          ],
        ),
      );
}
