import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/course.dart';
import '../models/course_registration.dart';

final _api = ApiClient();

final coursesProvider = FutureProvider<List<Course>>((ref) async {
  final data = await _api.get('/courses');
  return (data as List).map((j) => Course.fromJson(j)).toList();
});

final courseDetailProvider = FutureProvider.family<Course, int>((ref, courseId) async {
  final data = await _api.get('/courses/$courseId');
  return Course.fromJson(data);
});

final courseRegistrationsProvider =
    FutureProvider.family<List<CourseRegistration>, int>((ref, courseId) async {
  final data = await _api.get('/courses/$courseId/registrations');
  return (data as List).map((j) => CourseRegistration.fromJson(j)).toList();
});

final coursesSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final data = await _api.get('/courses/summary');
  return data as Map<String, dynamic>;
});

class CoursesNotifier extends AsyncNotifier<List<Course>> {
  @override
  Future<List<Course>> build() async {
    final data = await _api.get('/courses');
    return (data as List).map((j) => Course.fromJson(j)).toList();
  }

  Future<void> createCourse(Map<String, dynamic> data) async {
    await _api.post('/courses', data);
    ref.invalidateSelf();
    ref.invalidate(coursesSummaryProvider);
  }

  Future<void> updateCourse(int courseId, Map<String, dynamic> data) async {
    await _api.put('/courses/$courseId', data);
    ref.invalidateSelf();
    ref.invalidate(courseDetailProvider(courseId));
  }

  Future<void> deleteCourse(int courseId) async {
    await _api.delete('/courses/$courseId');
    ref.invalidateSelf();
  }
}

final coursesNotifierProvider =
    AsyncNotifierProvider<CoursesNotifier, List<Course>>(CoursesNotifier.new);
