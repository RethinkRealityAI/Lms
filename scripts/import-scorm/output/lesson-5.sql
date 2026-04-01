DO $$ DECLARE v_lesson_id uuid; BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE module_id = 'a4ce8c6c-ea88-45fb-b590-05fb329347c3' AND order_index = 5;
  IF v_lesson_id IS NULL THEN
    INSERT INTO lessons (course_id, module_id, institution_id, title, order_index, content_type, content_url, is_required)
    VALUES ('6b4906f1-803b-40bb-8582-d591220e5d09', 'a4ce8c6c-ea88-45fb-b590-05fb329347c3', '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'Lesson 4: What is Effective Advocacy', 5, 'blocks', '', true)
    RETURNING id INTO v_lesson_id;
  END IF;
  DELETE FROM lesson_blocks WHERE lesson_id = v_lesson_id;
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', 'Advocacy vs Effective Advocacy?', '{"html":"<p></p>\n<p>Advocacy is an act of supporting or promoting a cause, idea, or policy to bring about change or influence decisions within political, economic, social systems and institutions.</p>\n<p>Effective advocacy is the art of targeting and accomplishing an advocacy action. It utilizes strategic planning and targeted action.</p>\n<img src=\"fit_content_assets/advocacy-colored_woman_with_speaker_wqnuj2.jpg\" alt=\"\" />\n<p>Skills: Effective advocacy requires a range of skills, including networking, public speaking, persuasive writing, and critical thinking.</p>\n<p>In addition, active listening, empathy, and the ability to build relationships and collaborate with others are also important skills for advocates.</p>\n<p>Advocacy Platforms: Various platforms, such as public speaking, letter-writing campaigns, lobbying events, and social media, can be used for advocacy. </p>\n<p></p>","media":[{"type":"image","url":"fit_content_assets/advocacy-colored_woman_with_speaker_wqnuj2.jpg"}],"mode":"scrolling"}'::jsonb, 0, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 1, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 2, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', '', '{"html":"","mode":"fallback","original_type":"multiple-choice-game"}'::jsonb, 3, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'cta', '', '{"action":"complete_lesson","text":"Nice work. You''ve completed this lesson.","button_label":"Exit Lesson"}'::jsonb, 4, true, 1, '{}'::jsonb); END $$;