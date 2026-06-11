import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../models/course.dart';

class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> {
  final ApiClient _apiClient = ApiClient();
  late Future<List<Course>> _futureCourses;

  @override
  void initState() {
    super.initState();
    _futureCourses = _fetchCourses();
  }

  Future<List<Course>> _fetchCourses() async {
    final response = await _apiClient.get('/courses');
    return (response as List).map((json) => Course.fromJson(json)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Club Courses'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: FutureBuilder<List<Course>>(
        future: _futureCourses,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('No courses found.'));
          }

          final courses = snapshot.data!;
          return ListView.builder(
            itemCount: courses.length,
            padding: const EdgeInsets.all(8.0),
            itemBuilder: (context, index) {
              final course = courses[index];
              return Card(
                elevation: 2,
                margin: const EdgeInsets.symmetric(vertical: 8),
                child: ListTile(
                  title: Text(course.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('${course.category} • Capacity: ${course.capacity}'),
                  trailing: Chip(
                    label: Text(course.status.toUpperCase()),
                    backgroundColor: course.status == 'open' ? Colors.green[100] : Colors.red[100],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Navigate to create course screen
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
