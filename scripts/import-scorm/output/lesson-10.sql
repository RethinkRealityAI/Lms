DO $$ DECLARE v_lesson_id uuid; BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE module_id = 'a4ce8c6c-ea88-45fb-b590-05fb329347c3' AND order_index = 10;
  IF v_lesson_id IS NULL THEN
    INSERT INTO lessons (course_id, module_id, institution_id, title, order_index, content_type, content_url, is_required)
    VALUES ('6b4906f1-803b-40bb-8582-d591220e5d09', 'a4ce8c6c-ea88-45fb-b590-05fb329347c3', '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'Lesson 9: Ethical Considerations in Advocacy', 10, 'blocks', '', true)
    RETURNING id INTO v_lesson_id;
  END IF;
  DELETE FROM lesson_blocks WHERE lesson_id = v_lesson_id;
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', 'Ethical Considerations in Patient Advocacy', '{"html":"<p>Patient advocacy should be conducted ethically, respecting the rights and dignity of all individuals involved.</p>\n<img src=\"fit_content_assets/ethical_considerations_egjaxz.jpg\" alt=\"\" />\n<p>A patient advocate must place the advocacy initiative ahead of any personal interest or personal gain, and disclose all facts in any situation where a potential conflict of interest may arise.</p>\n<p>A patient advocate should be:</p><ul><li><p>Transparent and honest,</p></li><li><p> Be accountable in their actions and communications,</p></li><li><p>Base advocacy efforts on accurate information and evidence.</p></li></ul><p></p>","media":[{"type":"image","url":"fit_content_assets/ethical_considerations_egjaxz.jpg"}],"mode":"scrolling"}'::jsonb, 0, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 1, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 2, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'cta', '', '{"action":"complete_lesson","text":"Nice work. You''ve completed this lesson.","button_label":"Exit Lesson"}'::jsonb, 3, true, 1, '{}'::jsonb); END $$;