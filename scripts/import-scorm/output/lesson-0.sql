DO $$ DECLARE v_lesson_id uuid; BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE module_id = 'a4ce8c6c-ea88-45fb-b590-05fb329347c3' AND order_index = 0;
  IF v_lesson_id IS NULL THEN
    INSERT INTO lessons (course_id, module_id, institution_id, title, order_index, content_type, content_url, is_required)
    VALUES ('6b4906f1-803b-40bb-8582-d591220e5d09', 'a4ce8c6c-ea88-45fb-b590-05fb329347c3', '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'Introduction', 0, 'blocks', '', true)
    RETURNING id INTO v_lesson_id;
  END IF;
  DELETE FROM lesson_blocks WHERE lesson_id = v_lesson_id;
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'rich_text', 'Introduction to the Effective Advocacy Module', '{"html":"<p>In this module, learners will learn the fundamentals of becoming effective patient advocates; how to advocate with hospitals and governments, and how to personalize the knowledge to their region and country.</p>\n<img src=\"fit_content_assets/advocacy_images_p3z2nc.jpg\" alt=\"\" />\n<p><strong>Author: </strong>Lanre Tunji-Ajayi MSM</p><p><strong>Recognition</strong>: We recognize the video contributions of Ekawat Suwantaroj, Nehal Dhingra, and Eunice Owino.</p><p><strong>Image credits: </strong><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://www.freepic\">www.freep</a>ik.com</p>","media":[{"type":"image","url":"fit_content_assets/advocacy_images_p3z2nc.jpg"}],"mode":"scrolling"}'::jsonb, 0, true, 1, '{}'::jsonb);
  INSERT INTO lesson_blocks (lesson_id, institution_id, block_type, title, data, order_index, is_visible, version, settings)
  VALUES (v_lesson_id, '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a', 'cta', '', '{"action":"complete_lesson","text":"Nice work. You''ve completed this lesson.","button_label":"Exit Lesson"}'::jsonb, 1, true, 1, '{}'::jsonb); END $$;