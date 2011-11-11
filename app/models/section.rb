class Section < ActiveRecord::Base
  belongs_to :course

  # Configuration Key to access the configurations_hash of a register_course
  # this may need to become more advanced depending on if we discover unusual courses
  def configuration_key
    if self.course_subject_code == "PHYS" #PHYSICS DEPARTMENT Y U NO CONSISTENT?
      key = self.course_subject_code
    elsif self.code.nil? #If there is no code, assume all courses are in the same configuration
      key = self.course_subject_code
    elsif (true if Integer(self.code) rescue false) #If the code is an integer, assume the courses should be in the same configuration
      key = self.course_subject_code
    elsif self.code.length == 1
      key = self.course_subject_code
    elsif self.code.length == 2
      if (true if Integer(self.code[0]) rescue false)
        key = self.code[1] << self.code[0]
      else
        key = self.code[0]
        if (true if Integer(self.code[1]) rescue false)
          key << self.code[1]
        end
      end
    else
      key = self.code[0]
      if (true if Integer(self.code[1]) rescue false)
        unless (true if Integer(self.code[2]) rescue false)
          key << self.code[1]
        end
      end
    end
    return key
  end

  # Description: Checks to see if there is a time conflict
  def time_conflict?(days, start_time, end_time)
    return false if self.start_time.nil? or start_time.nil?
    day_array = days.split("")
    day_array.each do |day|
      if( self.days.include?(day) )
        if (self.start_time.to_i   >= start_time.to_i and self.start_time.to_i <= end_time.to_i) or 
           (start_time.to_i   >= self.start_time.to_i and start_time.to_i <= self.end_time.to_i)
          return true
        end 
      end
    end
    return false
  end

  def has_time_conflict?(section, time_constraints)
    if time_constraints.nil?
      return false
    end
    time_constaints.each do |time_constraint|
      if section.time_conflict?(time_constraint.days, time_constraint.start_time, time_constraint.end_time)
        return true
      end
    end
    return false
  end

  # Description: This function ensures that no two sections are conflicting
  #   Method: check that these sections fall within the same semester slot then
  #     Make sure that sectionb's start and end time is not between sectiona's start and end time
  def section_conflict?(section)
    if self.semester_slot & section.semester_slot > 0
      return time_conflict?(section.days, section.start_time, section.end_time)
    else 
      return false
    end
  end

  def schedule_conflict?(schedule)
    schedule.each do |section|
      return true if self.section_conflict?(section)
    end
    return false
  end

  def course_to_s
    return "#{course_subject_code} #{course_number}"
  end

  def duration
    return (end_time.hour - start_time.hour) + (end_time.min - start_time.min)/60.0
  end

  def duration_s
    return "#{print_time(start_time)}-#{print_time(end_time)}"
  end

  # NOTE: move this somewhere where every method can use it
  def print_time(time)
    hour = time.hour
    if( time.hour > 12 and time.hour < 24)
      return "#{time.hour-12}:%02dpm" % time.min
    elsif ( hour < 12 and hour != 0)
      return "#{time.hour}:%02dam" % time.min
    elsif ( hour == 24 )
      return "#{time.hour-12}:%02dam" % time.min
    elsif ( hour == 12 )
      return "#{time.hour}:%02dpm" % time.min
    end
    return "nil"
  end

  def self.hour_range(sections)
    finished_courses = []
    all_possible_sections = []
    sections.each do |section|
      course = section.course
      next if finished_courses.include?(course.id)

      # Build up a list of all possible sections for the course
      course.sections.each do |course_section|
        # Add it if we don't already have the section
        if !all_possible_sections.include?(course_section)
          all_possible_sections << course_section
        end
      end

      # Mark the course as already processed so we dont do it again
      finished_courses << course.id
    end

    earliest_start_hour = 24 * 60
    latest_end_time = 0
    
    all_possible_sections.each do |section|
      next if !section.start_time
      current_start_time = section.start_time.hour * 60 + section.start_time.min
      current_end_time = section.end_time.hour * 60 + section.end_time.min

      if current_start_time < earliest_start_hour
        earliest_start_hour = current_start_time
      end
      if current_end_time > latest_end_time
        latest_end_time = current_end_time
      end
    end

    earliest_start_hour = (earliest_start_hour.to_f/60).ceil
    latest_end_hour = (latest_end_time.to_f/60).ceil
    return earliest_start_hour, latest_end_hour
  end

end
