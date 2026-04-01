DO $$ DECLARE v_lesson_id uuid; BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE module_id = 'a4ce8c6c-ea88-45fb-b590-05fb329347c3' AND order_index = 9;
  IF v_lesson_id IS NULL THEN
    INSERT INTO lessons (course_id, module_id, institution_id, title, order_index, content_type, content_url, is_required)
    VALUES ('6b4906f1-803b-40bb-8582-d591220e5d09', 'a4ce8c6c-ea88-45fb-b590-05fb329347c3', '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'Lesson 8: Become a Patient Advocate', 9, 'blocks', '', true)
    RETURNING id INTO v_lesson_id;
  END IF;
  DELETE FROM lesson_blocks WHERE lesson_id = v_lesson_id;
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', 'Become a Patient Advocate', '{"html":"<p>Patient advocacy is a lifelong journey, requiring perseverance, resilience, and a commitment to making a positive difference in the lives of people affected by one or more disease(s).</p>\n<img src=\"fit_content_assets/become_an_advocate_dlzrei.jpg\" alt=\"\" />\n<p><strong>Who can become a patient advocate?</strong> </p><p>Anyone can become a patient advocate by first identifying a patient-related issue and taking action on it.</p><p>Joining advocacy organizations, attending workshops or training sessions, and volunteering for patient-related causes can provide valuable opportunities to learn and develop skills to become an effective patient advocate.</p>","media":[{"type":"image","url":"fit_content_assets/become_an_advocate_dlzrei.jpg"}],"mode":"scrolling"}'::jsonb, 0, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 1, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 2, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 3, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'cta', '', '{"action":"complete_lesson","text":"Nice work. You''ve completed this lesson.","button_label":"Exit Lesson"}'::jsonb, 4, true, 1, '{}'::jsonb); END $$;