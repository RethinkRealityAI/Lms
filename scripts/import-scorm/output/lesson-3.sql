DO $$ DECLARE v_lesson_id uuid; BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE module_id = 'a4ce8c6c-ea88-45fb-b590-05fb329347c3' AND order_index = 3;
  IF v_lesson_id IS NULL THEN
    INSERT INTO lessons (course_id, module_id, institution_id, title, order_index, content_type, content_url, is_required)
    VALUES ('6b4906f1-803b-40bb-8582-d591220e5d09', 'a4ce8c6c-ea88-45fb-b590-05fb329347c3', '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'Lesson 2: Learning Objectives', 3, 'blocks', '', true)
    RETURNING id INTO v_lesson_id;
  END IF;
  DELETE FROM lesson_blocks WHERE lesson_id = v_lesson_id;
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', 'Learning Objectives', '{"html":"<p>Following completion of this module, learners will be able to:</p><ul><li><p>Improve their advocacy work with their hospitals, health systems, and government</p></li><li><p>Support patients and families they serve to become better self-advocates</p></li><li><p>Better understand ethical considerations in advocacy</p></li><li><p>Apply critical thinking skills from the knowledge gained in this course module to their locality or country.</p></li></ul>\n<img src=\"fit_content_assets/Group_work_whd5ix.jpg\" alt=\"\" />\n<p></p>","media":[{"type":"image","url":"fit_content_assets/Group_work_whd5ix.jpg"}],"mode":"scrolling"}'::jsonb, 0, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'cta', '', '{"action":"complete_lesson","text":"Nice work. You''ve completed this lesson.","button_label":"Exit Lesson"}'::jsonb, 1, true, 1, '{}'::jsonb); END $$;